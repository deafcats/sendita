import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, isNull } from 'drizzle-orm';
import { getPrimaryClient } from '@anon-inbox/db';
import { users, messages, messageMetadata } from '@anon-inbox/db';
import { createHash } from 'crypto';
import {
  normalizeUnicode,
  isOnlyWhitespace,
  parseUserAgent,
  hashIp,
  hashValue,
  MESSAGE_MAX_LENGTH,
  MESSAGE_MIN_DELAY_MS,
  METADATA_PURGE_DAYS,
} from '@anon-inbox/shared';
import {
  checkIpPerInboxLimit,
  checkIpGlobalLimit,
  checkFingerprintLimit,
  checkPerInboxLimit,
  isShadowBanned,
} from '@/lib/rate-limit/index';
import { getModerationQueue } from '@anon-inbox/queue';
import { badRequest, notFound, tooManyRequests, serverError, getClientIp } from '@/lib/middleware';
import { encrypt } from '@/lib/encryption/index';
import { getRedisClient, setNx } from '@/lib/redis';

const KEYWORD_BLOCKLIST = [/\bcsam\b/i, /child\s+porn/i, /cp\s+link/i];
const HONEYPOT_FIELD = 'website'; // bots tend to fill this

const submitSchema = z.object({
  slug: z.string().min(1).max(20),
  body: z.string().min(1).max(MESSAGE_MAX_LENGTH),
  idempotencyKey: z.string().uuid(),
  fingerprintHash: z.string().max(128).optional(),
  sendDelayMs: z.number().int().min(0).max(60000).optional(),
  [HONEYPOT_FIELD]: z.string().optional(), // validated separately — filled = silent block
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON');
  }

  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const {
    slug,
    body: rawBody,
    idempotencyKey,
    fingerprintHash: clientFingerprintHash,
    sendDelayMs,
    [HONEYPOT_FIELD]: honeypot,
  } = parsed.data;

  // Honeypot check — shadow block silently
  if (honeypot && honeypot.length > 0) {
    return NextResponse.json({ success: true }, { status: 202 });
  }

  // Bot speed check
  if (sendDelayMs !== undefined && sendDelayMs < MESSAGE_MIN_DELAY_MS) {
    return NextResponse.json({ success: true }, { status: 202 });
  }

  // Idempotency check — atomic SET NX prevents race condition duplicates
  const redis = getRedisClient();
  const idempotencyRedisKey = `idempotency:${idempotencyKey}:${slug}`;
  const acquired = await setNx(idempotencyRedisKey, 'processing', 86400);
  if (!acquired) {
    // Another request with the same idempotency key is already in flight or completed
    return NextResponse.json({ success: true }, { status: 202 });
  }

  // Unicode normalization and validation
  const normalizedBody = normalizeUnicode(rawBody);
  if (isOnlyWhitespace(normalizedBody)) {
    return badRequest('Message body cannot be empty');
  }
  if (normalizedBody.length > MESSAGE_MAX_LENGTH) {
    return badRequest(`Message exceeds ${MESSAGE_MAX_LENGTH} character limit`);
  }

  // Keyword pre-filter
  const hasBlockedKeyword = KEYWORD_BLOCKLIST.some((re) =>
    re.test(normalizedBody),
  );

  // IP and fingerprint metadata
  const ip = getClientIp(req);
  const ipSalt = process.env['IP_HASH_SALT'] ?? 'default-salt';
  const ipHash = hashIp(ip, ipSalt);

  // Re-hash client fingerprint server-side
  const fingerprintHash = clientFingerprintHash
    ? hashValue(clientFingerprintHash + ipSalt)
    : null;

  // Geo from Vercel headers
  const regionCountry =
    (req.headers.get('x-vercel-ip-country') ?? req.headers.get('cf-ipcountry')) ?? null;
  const regionState =
    req.headers.get('x-vercel-ip-country-region') ?? null;
  const userAgent = req.headers.get('user-agent') ?? '';

  // Lookup inbox owner
  const db = getPrimaryClient();
  const [owner] = await db
    .select({ id: users.id, isBanned: users.isBanned, deletedAt: users.deletedAt })
    .from(users)
    .where(eq(users.slug, slug))
    .limit(1);

  if (!owner || owner.isBanned || owner.deletedAt) return notFound();

  // Rate limiting
  const [ipPerInbox, ipGlobal, fpLimit] = await Promise.all([
    checkIpPerInboxLimit(ipHash, slug),
    checkIpGlobalLimit(ipHash),
    fingerprintHash
      ? checkFingerprintLimit(fingerprintHash)
      : Promise.resolve({ allowed: true, remaining: 10, resetAt: new Date(), requiresCaptcha: false }),
  ]);

  if (!ipPerInbox.allowed || !ipGlobal.allowed) {
    return tooManyRequests();
  }

  if (!fpLimit.allowed) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        code: 'RATE_LIMITED',
        requiresCaptcha: fpLimit.requiresCaptcha,
      },
      { status: 429 },
    );
  }

  // Shadow ban check — respond 202 silently
  const banned = fingerprintHash ? await isShadowBanned(fingerprintHash) : false;
  const status = banned || hasBlockedKeyword ? 'shadow_blocked' : 'pending';

  // Per-inbox throttle check
  const inboxThrottle = await checkPerInboxLimit(owner.id);

  // Encrypt body before storage
  const encryptedBody = encrypt(normalizedBody);

  // Purge date
  const purgeAfter = new Date(Date.now() + METADATA_PURGE_DAYS * 24 * 60 * 60 * 1000);

  const { deviceType, browser } = parseUserAgent(userAgent);

  try {
    // Insert message
    const [message] = await db
      .insert(messages)
      .values({
        inboxOwnerId: owner.id,
        body: encryptedBody,
        status,
        idempotencyKey,
      })
      .returning({ id: messages.id });

    if (!message) throw new Error('Message insert failed');

    // Insert metadata
    await db.insert(messageMetadata).values({
      messageId: message.id,
      ipHash,
      fingerprintHash,
      userAgent,
      deviceType,
      browser,
      regionCountry,
      regionState,
      sendDelayMs: sendDelayMs ?? null,
      purgeAfter,
    });

    // Update idempotency key with the actual message ID (was 'processing')
    await redis.setex(idempotencyRedisKey, 86400, message.id);

    // Enqueue for moderation (unless already shadow_blocked)
    if (status === 'pending' && !inboxThrottle.throttled) {
      const queue = getModerationQueue();
      await queue.add('moderate', {
        messageId: message.id,
        inboxOwnerId: owner.id,
        body: normalizedBody,
        metadata: {
          ipHash,
          fingerprintHash,
          userAgent,
          deviceType,
          regionCountry,
          regionState,
          sendDelayMs: sendDelayMs ?? null,
        },
      });
    } else if (status === 'pending' && inboxThrottle.throttled) {
      // Delayed queue for hot inbox
      const queue = getModerationQueue();
      await queue.add(
        'moderate',
        {
          messageId: message.id,
          inboxOwnerId: owner.id,
          body: normalizedBody,
          metadata: {
            ipHash,
            fingerprintHash,
            userAgent,
            deviceType,
            regionCountry,
            regionState,
            sendDelayMs: sendDelayMs ?? null,
          },
        },
        { delay: 30000 }, // 30s delay for throttled inboxes
      );
    }

    return NextResponse.json({ success: true }, { status: 202 });
  } catch (err) {
    console.error('Message submission error:', err);
    return serverError();
  }
}

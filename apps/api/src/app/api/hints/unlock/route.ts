import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, and, sql } from 'drizzle-orm';
import { getPrimaryClient } from '@anon-inbox/db';
import {
  messages,
  messageMetadata,
  hintUnlocks,
  users,
  subscriptions,
} from '@anon-inbox/db';
import { withAuth, badRequest, forbidden, notFound } from '@/lib/middleware';
import { decrypt, encrypt } from '@/lib/encryption/index';
import { generateHints } from '@anon-inbox/shared';

const unlockSchema = z.object({
  messageId: z.string().uuid(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  return withAuth(req, async (_req, user) => {
    const userId = user.sub as string;
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest('Invalid JSON');
    }

    const parsed = unlockSchema.safeParse(body);
    if (!parsed.success) return badRequest('Invalid messageId');

    const { messageId } = parsed.data;
    const db = getPrimaryClient();

    // Verify message belongs to this user
    const [message] = await db
      .select({ id: messages.id, inboxOwnerId: messages.inboxOwnerId })
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (!message) return notFound();
    if (message.inboxOwnerId !== userId) return forbidden();

    // Check if already unlocked (idempotent)
    const [existingUnlock] = await db
      .select({ id: hintUnlocks.id, hintsRevealed: hintUnlocks.hintsRevealed })
      .from(hintUnlocks)
      .where(
        and(
          eq(hintUnlocks.messageId, messageId),
          eq(hintUnlocks.userId, userId),
        ),
      )
      .limit(1);

    if (existingUnlock) {
      let hints = existingUnlock.hintsRevealed;
      try {
        hints = JSON.parse(decrypt(existingUnlock.hintsRevealed as string));
      } catch { /* already decrypted JSON */ }
      return NextResponse.json({ hints, alreadyUnlocked: true });
    }

    // Check premium / credits
    const [userRecord] = await db
      .select({ isPremium: users.isPremium, premiumExpiresAt: users.premiumExpiresAt })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const [sub] = await db
      .select({ hintCredits: subscriptions.hintCredits, status: subscriptions.status })
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);

    const isPremiumActive =
      userRecord?.isPremium &&
      userRecord.premiumExpiresAt &&
      userRecord.premiumExpiresAt > new Date();

    const hasCredits = (sub?.hintCredits ?? 0) > 0;

    if (!isPremiumActive && !hasCredits) {
      return NextResponse.json(
        { error: 'Insufficient credits', code: 'PAYMENT_REQUIRED' },
        { status: 402 },
      );
    }

    // Fetch metadata
    const [meta] = await db
      .select()
      .from(messageMetadata)
      .where(eq(messageMetadata.messageId, messageId))
      .limit(1);

    // Get owner info for region comparison
    const [owner] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    // Check if repeat sender
    const [repeatCheck] = await db
      .select({ count: sql<number>`count(*)` })
      .from(messageMetadata)
      .where(
        meta?.fingerprintHash
          ? and(
              eq(messageMetadata.fingerprintHash, meta.fingerprintHash),
            )
          : sql`false`,
      )
      .limit(1);

    const isRepeatSender = (repeatCheck?.count ?? 0) > 1;

    const hints = generateHints({
      deviceType: meta?.deviceType ?? 'unknown',
      userAgent: meta?.userAgent ?? '',
      regionCountry: meta?.regionCountry ?? null,
      regionState: meta?.regionState ?? null,
      sendDelayMs: meta?.sendDelayMs ?? null,
      isRepeatSender,
    });

    // Encrypt and store hints
    const encryptedHints = encrypt(JSON.stringify(hints));

    await db.insert(hintUnlocks).values({
      messageId,
      userId,
      hintsRevealed: encryptedHints,
    });

    // Deduct credit if not premium
    if (!isPremiumActive && hasCredits) {
      await db
        .update(subscriptions)
        .set({ hintCredits: sql`${subscriptions.hintCredits} - 1` })
        .where(eq(subscriptions.userId, userId));
    }

    return NextResponse.json({ hints, alreadyUnlocked: false });
  });
}

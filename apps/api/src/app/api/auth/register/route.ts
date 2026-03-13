import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPrimaryClient } from '@anon-inbox/db';
import { users, deviceSessions } from '@anon-inbox/db';
import { eq } from 'drizzle-orm';
import { hashSecret, generateRefreshToken, hashRefreshToken } from '@/lib/auth/device';
import { signAccessToken } from '@/lib/auth/jwt';
import { generateSlug } from '@/lib/slugs/index';
import { SLUG_COLLISION_MAX_RETRIES, COPPA_MIN_AGE } from '@anon-inbox/shared';
import { badRequest, serverError } from '@/lib/middleware';
import { randomUUID } from 'crypto';

const registerSchema = z.object({
  deviceSecret: z.string().min(32).max(128),
  pushToken: z.string().optional(),
  displayName: z.string().min(1).max(50).optional(),
  birthYear: z.number().int().min(1900).max(new Date().getFullYear()),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON');
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.message);
  }

  const { deviceSecret, pushToken, displayName, birthYear } = parsed.data;

  // COPPA age gate
  const age = new Date().getFullYear() - birthYear;
  if (age < COPPA_MIN_AGE) {
    return NextResponse.json(
      { error: 'Age requirement not met', code: 'AGE_GATE_FAILED' },
      { status: 403 },
    );
  }

  const db = getPrimaryClient();

  // Hash device secret
  const deviceSecretHash = await hashSecret(deviceSecret);

  // Generate slug with collision retry
  let slug: string | null = null;
  for (let attempt = 0; attempt < SLUG_COLLISION_MAX_RETRIES; attempt++) {
    const candidate = generateSlug();
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.slug, candidate))
      .limit(1);

    if (existing.length === 0) {
      slug = candidate;
      break;
    }
  }

  if (!slug) {
    return serverError('Failed to generate unique slug');
  }

  // Create user and session in a transaction
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const jti = randomUUID();
  const refreshExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  try {
    const [user] = await db
      .insert(users)
      .values({
        slug,
        displayName: displayName ?? null,
        deviceSecretHash,
        pushToken: pushToken ?? null,
        ageConfirmedAt: new Date(),
      })
      .returning({ id: users.id, slug: users.slug });

    if (!user) throw new Error('User creation failed');

    await db.insert(deviceSessions).values({
      userId: user.id,
      refreshTokenHash,
      jti,
      expiresAt: refreshExpiresAt,
    });

    const accessToken = await signAccessToken(user.id, jti);

    return NextResponse.json(
      {
        accessToken,
        refreshToken,
        userId: user.id,
        slug: user.slug,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error('Registration error:', err);
    return serverError();
  }
}

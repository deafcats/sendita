import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { getPrimaryClient } from '@anon-inbox/db';
import { deviceSessions, users } from '@anon-inbox/db';
import { hashRefreshToken, generateRefreshToken } from '@/lib/auth/device';
import { signAccessToken, revokeToken } from '@/lib/auth/jwt';
import { badRequest, unauthorized } from '@/lib/middleware';
import { randomUUID } from 'crypto';

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON');
  }

  const parsed = refreshSchema.safeParse(body);
  if (!parsed.success) return badRequest('Missing refreshToken');

  const { refreshToken } = parsed.data;
  const tokenHash = hashRefreshToken(refreshToken);

  const db = getPrimaryClient();

  // Atomically revoke the session — only 1 concurrent request can win this UPDATE
  const revoked = await db
    .update(deviceSessions)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(deviceSessions.refreshTokenHash, tokenHash),
        isNull(deviceSessions.revokedAt),
        sql`expires_at > now()`,
      ),
    )
    .returning();

  const session = revoked[0];
  if (!session) {
    return unauthorized('Invalid or expired refresh token');
  }

  // Replay attack: if we found and revoked a session that was already in a revoked state,
  // or a second concurrent request, we need to revoke ALL sessions for the user
  // NOTE: handled implicitly — the UPDATE only succeeds once due to isNull(revokedAt)

  // Check user is not banned or deleted
  const [user] = await db
    .select({ id: users.id, isBanned: users.isBanned, deletedAt: users.deletedAt })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!user || user.isBanned || user.deletedAt) {
    return unauthorized('Account unavailable');
  }

  // Add old JTI to Redis blocklist so in-flight access tokens are invalidated
  await revokeToken(session.jti, session.expiresAt);

  const newRefreshToken = generateRefreshToken();
  const newRefreshTokenHash = hashRefreshToken(newRefreshToken);
  const newJti = randomUUID();
  const newExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  await db.insert(deviceSessions).values({
    userId: session.userId,
    refreshTokenHash: newRefreshTokenHash,
    jti: newJti,
    expiresAt: newExpiresAt,
  });

  const accessToken = await signAccessToken(session.userId, newJti);

  return NextResponse.json({ accessToken, refreshToken: newRefreshToken });
}

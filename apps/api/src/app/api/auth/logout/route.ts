import { NextRequest, NextResponse } from 'next/server';
import { eq, and, isNull } from 'drizzle-orm';
import { getPrimaryClient } from '@anon-inbox/db';
import { deviceSessions } from '@anon-inbox/db';
import { withAuth } from '@/lib/middleware';
import { revokeToken } from '@/lib/auth/jwt';

export async function POST(req: NextRequest): Promise<NextResponse> {
  return withAuth(req, async (_req, user) => {
    const db = getPrimaryClient();

    // Revoke all active sessions for this user
    const activeSessions = await db
      .select({ id: deviceSessions.id, jti: deviceSessions.jti, expiresAt: deviceSessions.expiresAt })
      .from(deviceSessions)
      .where(
        and(
          eq(deviceSessions.userId, user.sub as string),
          isNull(deviceSessions.revokedAt),
        ),
      );

    await Promise.all(
      activeSessions.map(async (session) => {
        await revokeToken(session.jti, session.expiresAt);
        await db
          .update(deviceSessions)
          .set({ revokedAt: new Date() })
          .where(eq(deviceSessions.id, session.id));
      }),
    );

    return NextResponse.json({ success: true });
  });
}

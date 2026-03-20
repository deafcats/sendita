import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getPrimaryClient } from '@anon-inbox/db';
import { users } from '@anon-inbox/db';
import { withAuth } from '@/lib/middleware';
import { getAccountDeletionQueue } from '@anon-inbox/queue';
import { revokeAllUserSessions } from '@/lib/auth/session';

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  return withAuth(req, async (_req, user) => {
    const userId = user.id;
    const db = getPrimaryClient();

    // Soft delete
    await db
      .update(users)
      .set({ deletedAt: new Date() })
      .where(eq(users.id, userId));

    // Revoke all sessions immediately
    await revokeAllUserSessions(userId);

    // Enqueue hard deletion job (runs within 30 days)
    const queue = getAccountDeletionQueue();
    await queue.add(
      'delete-account',
      { userId },
      { delay: 0 }, // Can add delay here if you want a grace period before hard delete
    );

    return NextResponse.json({ success: true });
  });
}

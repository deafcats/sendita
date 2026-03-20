import { NextRequest, NextResponse } from 'next/server';
import { and, count, eq } from 'drizzle-orm';
import { getPrimaryClient } from '@anon-inbox/db';
import { messages } from '@anon-inbox/db';
import { withAuth } from '@/lib/middleware';

export async function GET(req: NextRequest): Promise<NextResponse> {
  return withAuth(req, async (_req, user) => {
    const db = getPrimaryClient();

    const [total, unread, flagged, blocked] = await Promise.all([
      db
        .select({ count: count() })
        .from(messages)
        .where(eq(messages.inboxOwnerId, user.id)),
      db
        .select({ count: count() })
        .from(messages)
        .where(and(eq(messages.inboxOwnerId, user.id), eq(messages.isRead, false))),
      db
        .select({ count: count() })
        .from(messages)
        .where(and(eq(messages.inboxOwnerId, user.id), eq(messages.status, 'flagged'))),
      db
        .select({ count: count() })
        .from(messages)
        .where(and(eq(messages.inboxOwnerId, user.id), eq(messages.status, 'blocked'))),
    ]);

    return NextResponse.json({
      totalQuestions: total[0]?.count ?? 0,
      unreadQuestions: unread[0]?.count ?? 0,
      flaggedQuestions: flagged[0]?.count ?? 0,
      blockedQuestions: blocked[0]?.count ?? 0,
      approvedQuestions:
        (total[0]?.count ?? 0) - (flagged[0]?.count ?? 0) - (blocked[0]?.count ?? 0),
    });
  });
}

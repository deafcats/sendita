import { NextRequest, NextResponse } from 'next/server';
import { eq, and, lt, desc, or } from 'drizzle-orm';
import { getReplicaClient, getPrimaryClient } from '@anon-inbox/db';
import { messages } from '@anon-inbox/db';
import { withAuth } from '@/lib/middleware';
import { decodeCursor, encodeCursor } from '@anon-inbox/shared';
import { decrypt } from '@/lib/encryption/index';
import { getRedisClient } from '@/lib/redis';

const PAGE_SIZE = 20;

export async function GET(req: NextRequest): Promise<NextResponse> {
  return withAuth(req, async (_req, user) => {
    const userId = user.sub as string;
    const { searchParams } = new URL(req.url);
    const cursorParam = searchParams.get('cursor');

    // Check read-your-writes: route to primary if recently written
    const redis = getRedisClient();
    const usesPrimary = await redis.get(`ryw:${userId}`);
    const db = usesPrimary ? getPrimaryClient() : getReplicaClient();

    const cursor = cursorParam ? decodeCursor(cursorParam) : null;

    const conditions = [
      eq(messages.inboxOwnerId, userId),
      or(
        eq(messages.status, 'approved'),
        eq(messages.status, 'flagged'),
      ),
    ];

    if (cursor) {
      conditions.push(
        lt(messages.createdAt, cursor.createdAt),
      );
    }

    const rows = await db
      .select({
        id: messages.id,
        body: messages.body,
        status: messages.status,
        isRead: messages.isRead,
        isAutomated: messages.isAutomated,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(and(...conditions))
      .orderBy(desc(messages.createdAt))
      .limit(PAGE_SIZE + 1);

    const hasMore = rows.length > PAGE_SIZE;
    const items = rows.slice(0, PAGE_SIZE);

    // Decrypt bodies
    const decryptedItems = items.map((msg) => {
      let body = msg.body;
      try {
        body = decrypt(msg.body);
      } catch {
        body = '[Message unavailable]';
      }
      return { ...msg, body };
    });

    const lastItem = items[items.length - 1];
    const nextCursor =
      hasMore && lastItem
        ? encodeCursor({ createdAt: lastItem.createdAt, id: lastItem.id })
        : null;

    return NextResponse.json({
      items: decryptedItems,
      nextCursor,
      hasMore,
    });
  });
}

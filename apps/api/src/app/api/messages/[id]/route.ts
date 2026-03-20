import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getPrimaryClient } from '@anon-inbox/db';
import { messages } from '@anon-inbox/db';
import { decrypt } from '@/lib/encryption';
import { badRequest, notFound, withAuth } from '@/lib/middleware';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  return withAuth(req, async (_req, user) => {
    const { id } = await params;
    const db = getPrimaryClient();
    const [message] = await db
      .select({
        id: messages.id,
        inboxOwnerId: messages.inboxOwnerId,
        body: messages.body,
        status: messages.status,
        isRead: messages.isRead,
        isAutomated: messages.isAutomated,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(and(eq(messages.id, id), eq(messages.inboxOwnerId, user.id)))
      .limit(1);

    if (!message) return notFound();

    return NextResponse.json({
      ...message,
      body: decrypt(message.body),
    });
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  return withAuth(req, async (_req, user) => {
    const { id } = await params;
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest('Invalid JSON');
    }

    const payload = body as { isRead?: boolean; status?: 'approved' | 'flagged' | 'blocked' };
    const values: { isRead?: boolean; status?: 'approved' | 'flagged' | 'blocked' } = {};
    if (typeof payload.isRead === 'boolean') values.isRead = payload.isRead;
    if (payload.status) values.status = payload.status;
    if (Object.keys(values).length === 0) return badRequest('No changes provided');

    const db = getPrimaryClient();
    const [message] = await db
      .update(messages)
      .set(values)
      .where(and(eq(messages.id, id), eq(messages.inboxOwnerId, user.id)))
      .returning({
        id: messages.id,
        body: messages.body,
        status: messages.status,
        isRead: messages.isRead,
        isAutomated: messages.isAutomated,
        createdAt: messages.createdAt,
      });

    if (!message) return notFound();

    return NextResponse.json({
      ...message,
      body: decrypt(message.body),
    });
  });
}

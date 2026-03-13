import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getPrimaryClient } from '@anon-inbox/db';
import { messages, users, messageMetadata, auditLog } from '@anon-inbox/db';
import { withAdminAuth } from '../lib/ip-allowlist';
import { getRedisClient } from '../lib/redis';

const actionSchema = z.object({
  messageId: z.string().uuid(),
  action: z.enum([
    'approve',
    'block',
    'ban_sender_fingerprint',
    'ban_inbox_owner',
  ]),
  adminNote: z.string().optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  return withAdminAuth(req, async () => {
    let body: unknown;
    try { body = await req.json(); } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { messageId, action, adminNote } = parsed.data;
    const db = getPrimaryClient();

    const [message] = await db
      .select({ id: messages.id, inboxOwnerId: messages.inboxOwnerId })
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const redis = getRedisClient();

    switch (action) {
      case 'approve':
        await db.update(messages).set({ status: 'approved' }).where(eq(messages.id, messageId));
        break;

      case 'block':
        await db.update(messages).set({ status: 'blocked' }).where(eq(messages.id, messageId));
        break;

      case 'ban_sender_fingerprint': {
        const [meta] = await db
          .select({ fingerprintHash: messageMetadata.fingerprintHash })
          .from(messageMetadata)
          .where(eq(messageMetadata.messageId, messageId))
          .limit(1);

        if (meta?.fingerprintHash) {
          await redis.setex(
            `shadowban-permanent:${meta.fingerprintHash}`,
            365 * 24 * 60 * 60,
            '1',
          );
        }
        await db.update(messages).set({ status: 'blocked' }).where(eq(messages.id, messageId));
        break;
      }

      case 'ban_inbox_owner':
        await db
          .update(users)
          .set({ isBanned: true })
          .where(eq(users.id, message.inboxOwnerId));
        break;
    }

    // Audit log
    await db.insert(auditLog).values({
      action: `admin_${action}`,
      targetId: messageId,
      targetType: 'message',
      metadata: { adminNote: adminNote ?? null },
    });

    return NextResponse.json({ success: true });
  });
}

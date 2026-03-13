import { NextRequest, NextResponse } from 'next/server';
import { eq, desc, and } from 'drizzle-orm';
import { getPrimaryClient } from '@anon-inbox/db';
import { messages, reports, auditLog } from '@anon-inbox/db';
import { withAdminAuth } from '../lib/ip-allowlist';
import { decrypt } from '../lib/encryption';

export async function GET(req: NextRequest): Promise<NextResponse> {
  return withAdminAuth(req, async () => {
    const db = getPrimaryClient();

    const flaggedMessages = await db
      .select({
        id: messages.id,
        body: messages.body,
        status: messages.status,
        inboxOwnerId: messages.inboxOwnerId,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(eq(messages.status, 'flagged'))
      .orderBy(desc(messages.createdAt))
      .limit(100);

    const decrypted = flaggedMessages.map((m) => {
      let body = m.body;
      try { body = decrypt(m.body); } catch { body = '[unavailable]'; }
      return { ...m, body };
    });

    return NextResponse.json({ messages: decrypted });
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getPrimaryClient } from '@anon-inbox/db';
import { messages, reports } from '@anon-inbox/db';
import { withAuth, badRequest, forbidden, notFound } from '@/lib/middleware';
import { getCsamReportQueue } from '@anon-inbox/queue';

const reportSchema = z.object({
  messageId: z.string().uuid(),
  reason: z.enum(['harassment', 'spam', 'hate', 'self_harm', 'csam', 'other']),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  return withAuth(req, async (_req, user) => {
    const userId = user.id;
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest('Invalid JSON');
    }

    const parsed = reportSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.message);

    const { messageId, reason } = parsed.data;
    const db = getPrimaryClient();

    // Verify message belongs to this user
    const [message] = await db
      .select({ id: messages.id, inboxOwnerId: messages.inboxOwnerId })
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (!message) return notFound();
    if (message.inboxOwnerId !== userId) return forbidden();

    await db.insert(reports).values({
      messageId,
      reportedBy: userId,
      reason,
      status: 'pending',
    });

    // CSAM / self-harm: escalate immediately
    if (reason === 'csam') {
      const queue = getCsamReportQueue();
      await queue.add('report-csam', {
        messageId,
        csamReportId: messageId, // Will be replaced by actual CSAM report ID
      });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  });
}

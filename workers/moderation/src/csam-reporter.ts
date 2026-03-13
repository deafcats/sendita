import { getPrimaryClient } from '@anon-inbox/db';
import { csamReports, messages, messageMetadata } from '@anon-inbox/db';
import { eq } from 'drizzle-orm';
import { createHash } from 'crypto';

export async function createCsamReport(
  messageId: string,
  moderationScore: string,
): Promise<string> {
  const db = getPrimaryClient();

  // Get message content and metadata
  const [message] = await db
    .select({ body: messages.body })
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1);

  const [meta] = await db
    .select({ ipHash: messageMetadata.ipHash })
    .from(messageMetadata)
    .where(eq(messageMetadata.messageId, messageId))
    .limit(1);

  const messageContentHash = message
    ? createHash('sha256').update(message.body).digest('hex')
    : 'unknown';

  // Create CSAM report record
  const [report] = await db
    .insert(csamReports)
    .values({
      messageId,
      messageContentHash,
      moderationScore,
      ipHash: meta?.ipHash ?? null,
      status: 'pending',
    })
    .returning({ id: csamReports.id });

  if (!report) throw new Error('CSAM report creation failed');

  // In production: call NCMEC CyberTipline API here
  // For now: log for admin review
  console.error(
    `[CSAM] Report created: ${report.id} for message ${messageId}. ` +
      'Admin must submit to NCMEC within 24 hours.',
  );

  return report.id;
}

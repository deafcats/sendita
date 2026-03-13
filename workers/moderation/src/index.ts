import { Worker, type Job } from 'bullmq';
import { eq, and } from 'drizzle-orm';
import { getPrimaryClient } from '@anon-inbox/db';
import { messages, messageMetadata, auditLog } from '@anon-inbox/db';
import {
  getRedisConnection,
  getModerationDLQ,
  getPushNotificationQueue,
  QUEUE_NAMES,
  type ModerationJobData,
} from '@anon-inbox/queue';
import { normalizeUnicode } from '@anon-inbox/shared';
import { moderateContent } from './moderation-service';
import { createCsamReport } from './csam-reporter';
import IORedis from 'ioredis';

const DLQ_ALERT_THRESHOLD = 100;

async function processModerationJob(
  job: Job<ModerationJobData>,
): Promise<void> {
  const { messageId, inboxOwnerId, body, metadata } = job.data;
  const db = getPrimaryClient();

  // Unicode normalize before moderation
  const normalizedBody = normalizeUnicode(body);

  let moderationResult;
  try {
    moderationResult = await moderateContent(normalizedBody);
  } catch (err) {
    console.error(`Moderation API error for message ${messageId}:`, err);
    throw err; // Will trigger retry
  }

  const { category } = moderationResult;

  // Map category to message status
  let newStatus: 'approved' | 'flagged' | 'blocked';

  switch (category) {
    case 'clean':
    case 'low_risk':
      newStatus = 'approved';
      break;
    case 'high_risk_harassment':
    case 'high_risk_hate':
      newStatus = 'flagged';
      break;
    case 'self_harm':
    case 'csam':
      newStatus = 'blocked';
      break;
    default:
      newStatus = 'flagged';
  }

  await db
    .update(messages)
    .set({ status: newStatus })
    .where(eq(messages.id, messageId));

  // CSAM: create report and permanently block sender
  if (category === 'csam') {
    await createCsamReport(
      messageId,
      JSON.stringify(moderationResult.scores),
    );

    // Permanently ban fingerprint and IP hash
    if (metadata.fingerprintHash) {
      const { default: IORedis } = await import('ioredis');
      const redis = new IORedis(process.env['REDIS_URL'] ?? '');
      await redis.setex(
        `shadowban-permanent:${metadata.fingerprintHash}`,
        365 * 24 * 60 * 60,
        '1',
      );
      await redis.quit();
    }

    await db.insert(auditLog).values({
      action: 'csam_detected',
      targetId: messageId,
      targetType: 'message',
      metadata: { scores: moderationResult.scores },
    });
    return; // No push notification for CSAM
  }

  // Self-harm: no push notification, mark crisis flag in audit log
  if (category === 'self_harm') {
    await db.insert(auditLog).values({
      action: 'self_harm_detected',
      targetId: messageId,
      targetType: 'message',
      metadata: { scores: moderationResult.scores },
    });
    return;
  }

  // For approved messages: enqueue push notification
  if (newStatus === 'approved') {
    const pushQueue = getPushNotificationQueue();
    await pushQueue.add('send-push', {
      inboxOwnerId,
      messageId,
      isFirst: true,
    });

    // Set read-your-writes flag for 5 seconds
    const redis = getRedisConnection();
    await (redis as IORedis).setex(`ryw:${inboxOwnerId}`, 5, '1');
  }
}

async function monitorDLQ(): Promise<void> {
  const dlq = getModerationDLQ();
  const count = await dlq.getJobCounts('wait', 'active', 'failed');
  const total = (count.wait ?? 0) + (count.active ?? 0) + (count.failed ?? 0);

  if (total > DLQ_ALERT_THRESHOLD) {
    console.error(`[ALERT] DLQ depth ${total} exceeds threshold ${DLQ_ALERT_THRESHOLD}`);
    // In production: trigger PagerDuty / Sentry alert here
  }
}

// Start worker
const worker = new Worker<ModerationJobData>(
  QUEUE_NAMES.MODERATION,
  processModerationJob,
  {
    connection: getRedisConnection(),
    concurrency: 10,
  },
);

worker.on('failed', async (job, err) => {
  if (!job) return;
  console.error(`Moderation job ${job.id} failed:`, err);

  // After max retries: move to DLQ
  if (job.attemptsMade >= (job.opts.attempts ?? 3)) {
    const dlq = getModerationDLQ();
    await dlq.add('failed-moderation', job.data);
    await monitorDLQ();
  }
});

worker.on('completed', (job) => {
  console.log(`Moderation job ${job.id} completed for message ${job.data.messageId}`);
});

worker.on('error', (err) => {
  console.error('Worker error:', err);
});

console.log('Moderation worker started');

// Monitor DLQ every 5 minutes
setInterval(monitorDLQ, 5 * 60 * 1000);

process.on('SIGTERM', async () => {
  await worker.close();
  process.exit(0);
});

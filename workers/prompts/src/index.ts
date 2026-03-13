import { Worker, Queue, type Job } from 'bullmq';
import { createCipheriv, randomBytes } from 'crypto';
import { eq, and, gte, not, sql, count, asc } from 'drizzle-orm';
import { getPrimaryClient } from '@anon-inbox/db';
import {
  users,
  messages,
  engagementPrompts,
} from '@anon-inbox/db';
import {
  getRedisConnection,
  getPushNotificationQueue,
  QUEUE_NAMES,
  type EngagementPromptJobData,
} from '@anon-inbox/queue';
import {
  ENGAGEMENT_PROMPT_RATIO_MAX,
  ENGAGEMENT_PROMPT_MAX_PER_WEEK,
  ENGAGEMENT_PROMPT_IDLE_HOURS,
} from '@anon-inbox/shared';
const PROMPT_CHECK_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

async function shouldSendPrompt(ownerId: string): Promise<boolean> {
  const db = getPrimaryClient();

  // Check inbox age > 1 hour
  const [user] = await db
    .select({ createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, ownerId))
    .limit(1);

  if (!user) return false;
  const ageHours = (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60);
  if (ageHours < 1) return false;

  const idleWindowStart = new Date(Date.now() - ENGAGEMENT_PROMPT_IDLE_HOURS * 60 * 60 * 1000);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Check: no real messages in last 48 hours
  const [recentReal] = await db
    .select({ count: count() })
    .from(messages)
    .where(
      and(
        eq(messages.inboxOwnerId, ownerId),
        eq(messages.isAutomated, false),
        eq(messages.status, 'approved'),
        gte(messages.createdAt, idleWindowStart),
      ),
    );

  if ((recentReal?.count ?? 0) > 0) return false;

  // Check: fewer than max automated prompts in last 7 days
  const [recentPrompts] = await db
    .select({ count: count() })
    .from(messages)
    .where(
      and(
        eq(messages.inboxOwnerId, ownerId),
        eq(messages.isAutomated, true),
        gte(messages.createdAt, weekAgo),
      ),
    );

  if ((recentPrompts?.count ?? 0) >= ENGAGEMENT_PROMPT_MAX_PER_WEEK) return false;

  // Check: automated messages never exceed 20% of total
  const [totalMessages] = await db
    .select({ count: count() })
    .from(messages)
    .where(eq(messages.inboxOwnerId, ownerId));

  const [automatedMessages] = await db
    .select({ count: count() })
    .from(messages)
    .where(
      and(eq(messages.inboxOwnerId, ownerId), eq(messages.isAutomated, true)),
    );

  const total = totalMessages?.count ?? 0;
  const automated = automatedMessages?.count ?? 0;

  if (total > 0 && automated / total >= ENGAGEMENT_PROMPT_RATIO_MAX) return false;

  return true;
}

async function sendEngagementPrompt(ownerId: string): Promise<void> {
  const db = getPrimaryClient();

  // Get least-used active prompt
  const [prompt] = await db
    .select({ id: engagementPrompts.id, body: engagementPrompts.body })
    .from(engagementPrompts)
    .where(eq(engagementPrompts.isActive, true))
    .orderBy(asc(engagementPrompts.usageCount))
    .limit(1);

  if (!prompt) {
    console.warn('No active engagement prompts found');
    return;
  }

  const encryptedBody = encrypt(prompt.body);

  const [message] = await db
    .insert(messages)
    .values({
      inboxOwnerId: ownerId,
      body: encryptedBody,
      status: 'approved',
      isAutomated: true,
    })
    .returning({ id: messages.id });

  if (!message) return;

  // Increment usage count
  await db
    .update(engagementPrompts)
    .set({ usageCount: sql`${engagementPrompts.usageCount} + 1` })
    .where(eq(engagementPrompts.id, prompt.id));

  // Send push notification
  const pushQueue = getPushNotificationQueue();
  await pushQueue.add('send-push', {
    inboxOwnerId: ownerId,
    messageId: message.id,
    isFirst: true,
  });
}

// Encryption helper — same algorithm as apps/api/src/lib/encryption/index.ts
function encrypt(text: string): string {
  const key = Buffer.from(process.env['ENCRYPTION_KEY'] ?? '', 'hex');
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(':');
}

const worker = new Worker<EngagementPromptJobData>(
  QUEUE_NAMES.ENGAGEMENT_PROMPTS,
  async (job: Job<EngagementPromptJobData>) => {
    const { inboxOwnerId } = job.data;
    const shouldSend = await shouldSendPrompt(inboxOwnerId);
    if (shouldSend) {
      await sendEngagementPrompt(inboxOwnerId);
    }
  },
  {
    connection: getRedisConnection(),
    concurrency: 5,
  },
);

worker.on('error', (err) => {
  console.error('Prompts worker error:', err);
});

// Scheduled job: check all active inboxes every 15 minutes
async function schedulePromptChecks(): Promise<void> {
  const db = getPrimaryClient();
  const promptQueue = new Queue<EngagementPromptJobData>(
    QUEUE_NAMES.ENGAGEMENT_PROMPTS,
    { connection: getRedisConnection() },
  );

  const activeUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.isBanned, false),
        sql`${users.deletedAt} IS NULL`,
      ),
    )
    .limit(10000);

  for (const user of activeUsers) {
    await promptQueue.add('check-prompt', { inboxOwnerId: user.id });
  }

  console.log(`Scheduled prompt checks for ${activeUsers.length} inboxes`);
}

schedulePromptChecks().catch(console.error);
setInterval(() => schedulePromptChecks().catch(console.error), PROMPT_CHECK_INTERVAL_MS);

console.log('Engagement prompts worker started');

process.on('SIGTERM', async () => {
  await worker.close();
  process.exit(0);
});

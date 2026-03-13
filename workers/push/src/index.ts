import { Worker, type Job } from 'bullmq';
import { Expo, type ExpoPushMessage, type ExpoPushTicket } from 'expo-server-sdk';
import { eq } from 'drizzle-orm';
import { getPrimaryClient } from '@anon-inbox/db';
import { users } from '@anon-inbox/db';
import {
  getRedisConnection,
  QUEUE_NAMES,
  type PushNotificationJobData,
} from '@anon-inbox/queue';
import {
  PUSH_BATCH_WINDOW_SECONDS,
  PUSH_BATCH_THRESHOLD,
} from '@anon-inbox/shared';
import IORedis from 'ioredis';

const expo = new Expo({
  accessToken: process.env['EXPO_ACCESS_TOKEN'],
  useFcmV1: true,
});

async function sendOrBatchNotification(
  ownerId: string,
  messageId: string,
): Promise<void> {
  const db = getPrimaryClient();
  const redis = getRedisConnection() as IORedis;

  // Batch counter key (2-minute window)
  const batchKey = `push:batch:${ownerId}`;
  const countKey = `push:count:${ownerId}`;

  const pipeline = redis.pipeline();
  pipeline.incr(countKey);
  pipeline.expire(countKey, PUSH_BATCH_WINDOW_SECONDS, 'NX');
  const results = await pipeline.exec();
  const burstCount = (results?.[0]?.[1] as number) ?? 1;

  // Get user's push token
  const [user] = await db
    .select({
      pushToken: users.pushToken,
      pushTokenValid: users.pushTokenValid,
    })
    .from(users)
    .where(eq(users.id, ownerId))
    .limit(1);

  if (!user?.pushToken || !user.pushTokenValid) return;

  if (!Expo.isExpoPushToken(user.pushToken)) {
    console.warn(`Invalid Expo push token for user ${ownerId}`);
    await db.update(users).set({ pushTokenValid: false }).where(eq(users.id, ownerId));
    return;
  }

  // If this is the first in a burst, send individual notification
  // If it's within the burst window and above threshold, send/update batched notification
  let message: ExpoPushMessage;

  if (burstCount === 1) {
    message = {
      to: user.pushToken,
      title: 'New message',
      body: 'Someone sent you an anonymous message',
      data: { messageId, type: 'new_message' },
      sound: 'default',
    };
  } else if (burstCount === PUSH_BATCH_THRESHOLD) {
    // Threshold reached: send batched notification
    message = {
      to: user.pushToken,
      title: 'You have new messages',
      body: `${burstCount} people sent you anonymous messages`,
      data: { type: 'batch_messages', count: burstCount },
      sound: 'default',
    };
  } else if (burstCount > PUSH_BATCH_THRESHOLD) {
    // Already sent a batched notification; update via Redis but don't send another
    // (In production, use APNs/FCM notification update with collapse key)
    return;
  } else {
    message = {
      to: user.pushToken,
      title: 'New message',
      body: 'Someone sent you an anonymous message',
      data: { messageId, type: 'new_message' },
      sound: 'default',
    };
  }

  try {
    const tickets = await expo.sendPushNotificationsAsync([message]);
    await handleTickets(tickets, ownerId, user.pushToken);
  } catch (err) {
    console.error(`Push notification failed for user ${ownerId}:`, err);
    throw err;
  }
}

async function handleTickets(
  tickets: ExpoPushTicket[],
  ownerId: string,
  _token: string,
): Promise<void> {
  const db = getPrimaryClient();

  for (const ticket of tickets) {
    if (ticket.status === 'error') {
      if (ticket.details?.error === 'DeviceNotRegistered') {
        // Mark push token as stale — client will re-register on next open
        await db
          .update(users)
          .set({ pushTokenValid: false })
          .where(eq(users.id, ownerId));
        console.warn(`Push token invalidated for user ${ownerId}: DeviceNotRegistered`);
      } else {
        console.error(`Push error for user ${ownerId}:`, ticket.message);
      }
    }
  }
}

const worker = new Worker<PushNotificationJobData>(
  QUEUE_NAMES.PUSH_NOTIFICATIONS,
  async (job: Job<PushNotificationJobData>) => {
    await sendOrBatchNotification(job.data.inboxOwnerId, job.data.messageId);
  },
  {
    connection: getRedisConnection(),
    concurrency: 20,
  },
);

worker.on('failed', (job, err) => {
  console.error(`Push job ${job?.id} failed:`, err);
});

worker.on('error', (err) => {
  console.error('Push worker error:', err);
});

console.log('Push notification worker started');

process.on('SIGTERM', async () => {
  await worker.close();
  process.exit(0);
});

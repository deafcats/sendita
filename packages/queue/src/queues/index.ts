import { Queue } from 'bullmq';
import { getRedisConnection } from '../redis';
import type {
  ModerationJobData,
  PushNotificationJobData,
  EngagementPromptJobData,
  PurgeMetadataJobData,
  GracePeriodExpiryJobData,
  AccountDeletionJobData,
  CsamReportJobData,
} from '../jobs/index';

export const QUEUE_NAMES = {
  MODERATION: 'moderation',
  MODERATION_DLQ: 'moderation-dlq',
  PUSH_NOTIFICATIONS: 'push-notifications',
  ENGAGEMENT_PROMPTS: 'engagement-prompts',
  PURGE_METADATA: 'purge-metadata',
  GRACE_PERIOD_EXPIRY: 'grace-period-expiry',
  ACCOUNT_DELETION: 'account-deletion',
  CSAM_REPORT: 'csam-report',
} as const;

export function getModerationQueue() {
  return new Queue<ModerationJobData, void, string>(QUEUE_NAMES.MODERATION, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: false,
    },
  });
}

export function getModerationDLQ() {
  return new Queue<ModerationJobData, void, string>(QUEUE_NAMES.MODERATION_DLQ, {
    connection: getRedisConnection(),
  });
}

export function getPushNotificationQueue() {
  return new Queue<PushNotificationJobData, void, string>(QUEUE_NAMES.PUSH_NOTIFICATIONS, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: { count: 500 },
      removeOnFail: { count: 100 },
    },
  });
}

export function getEngagementPromptQueue() {
  return new Queue<EngagementPromptJobData, void, string>(QUEUE_NAMES.ENGAGEMENT_PROMPTS, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 2,
      removeOnComplete: true,
      removeOnFail: { count: 50 },
    },
  });
}

export function getPurgeMetadataQueue() {
  return new Queue<PurgeMetadataJobData, void, string>(QUEUE_NAMES.PURGE_METADATA, {
    connection: getRedisConnection(),
  });
}

export function getGracePeriodExpiryQueue() {
  return new Queue<GracePeriodExpiryJobData, void, string>(QUEUE_NAMES.GRACE_PERIOD_EXPIRY, {
    connection: getRedisConnection(),
  });
}

export function getAccountDeletionQueue() {
  return new Queue<AccountDeletionJobData, void, string>(QUEUE_NAMES.ACCOUNT_DELETION, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: 'exponential', delay: 5000 },
    },
  });
}

export function getCsamReportQueue() {
  return new Queue<CsamReportJobData, void, string>(QUEUE_NAMES.CSAM_REPORT, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: 'exponential', delay: 10000 },
      priority: 1,
    },
  });
}

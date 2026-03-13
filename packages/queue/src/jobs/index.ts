export interface ModerationJobData {
  messageId: string;
  inboxOwnerId: string;
  body: string;
  metadata: {
    ipHash: string | null;
    fingerprintHash: string | null;
    userAgent: string;
    deviceType: string;
    regionCountry: string | null;
    regionState: string | null;
    sendDelayMs: number | null;
  };
}

export interface PushNotificationJobData {
  inboxOwnerId: string;
  messageId: string;
  isFirst: boolean;
}

export interface EngagementPromptJobData {
  inboxOwnerId: string;
}

export interface PurgeMetadataJobData {
  batchSize: number;
}

export interface GracePeriodExpiryJobData {
  userId: string;
  subscriptionId: string;
}

export interface AccountDeletionJobData {
  userId: string;
}

export interface CsamReportJobData {
  messageId: string;
  csamReportId: string;
}

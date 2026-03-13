export type MessageStatus =
  | 'pending'
  | 'approved'
  | 'flagged'
  | 'blocked'
  | 'shadow_blocked';

export type ReportReason =
  | 'harassment'
  | 'spam'
  | 'hate'
  | 'self_harm'
  | 'csam'
  | 'other';

export type ReportStatus = 'pending' | 'reviewed' | 'actioned' | 'dismissed';

export type SubscriptionPlan = 'monthly' | 'annual';

export type SubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'grace';

export type RateLimitKeyType = 'ip' | 'fingerprint' | 'inbox';

export type DeviceType = 'ios' | 'android' | 'desktop' | 'unknown';

export type AnalyticsEventType =
  | 'link_view'
  | 'message_sent'
  | 'hint_unlocked'
  | 'premium_converted'
  | 'app_install_referral';

export interface User {
  id: string;
  slug: string;
  displayName: string | null;
  avatarUrl: string | null;
  isPremium: boolean;
  premiumExpiresAt: Date | null;
  isBanned: boolean;
  createdAt: Date;
}

export interface Message {
  id: string;
  inboxOwnerId: string;
  body: string;
  status: MessageStatus;
  isRead: boolean;
  isAutomated: boolean;
  createdAt: Date;
}

export interface MessageWithHint extends Message {
  hasHint: boolean;
  hintUnlocked: boolean;
  hintsRevealed?: HintsRevealed;
}

export interface HintsRevealed {
  device?: string;
  region?: string;
  repeatSender?: boolean;
  fastSend?: boolean;
  desktopSender?: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ApiError {
  error: string;
  code: string;
  statusCode: number;
}

export interface RateLimitInfo {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  requiresCaptcha: boolean;
}

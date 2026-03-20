export const SLUG_LENGTH = 6;
export const SLUG_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
export const VANITY_SLUG_MIN_LENGTH = 4;
export const SLUG_COLLISION_MAX_RETRIES = 3;

export const MESSAGE_MAX_LENGTH = 300;
export const MESSAGE_MIN_DELAY_MS = 800;

export const JWT_EXPIRES_IN = '15m';
export const REFRESH_TOKEN_EXPIRES_DAYS = 90;

export const RATE_LIMIT = {
  IP_PER_INBOX_COUNT: 15,
  IP_PER_INBOX_WINDOW_SECONDS: 600,
  IP_GLOBAL_COUNT: 30,
  IP_GLOBAL_WINDOW_SECONDS: 3600,
  FINGERPRINT_GLOBAL_COUNT: 15,
  FINGERPRINT_GLOBAL_WINDOW_SECONDS: 3600,
  INBOX_HOURLY_COUNT: 200,
  INBOX_HOURLY_WINDOW_SECONDS: 3600,
  CAPTCHA_VIOLATION_THRESHOLD: 1,
  CAPTCHA_LOCK_SECONDS: 3600,
} as const;

export const METADATA_PURGE_DAYS = 90;
export const PUSH_BATCH_WINDOW_SECONDS = 120;
export const PUSH_BATCH_THRESHOLD = 5;

export const ENGAGEMENT_PROMPT_RATIO_MAX = 0.2;
export const ENGAGEMENT_PROMPT_MAX_PER_WEEK = 3;
export const ENGAGEMENT_PROMPT_IDLE_HOURS = 48;

export const HINT_FREE_UNLOCK_INTERVAL_DAYS = 7;
export const SUBSCRIPTION_GRACE_PERIOD_DAYS = 7;

export const DLQ_ALERT_THRESHOLD = 100;
export const MODERATION_MAX_RETRIES = 3;

export const RESERVED_SLUGS = [
  'admin',
  'api',
  'app',
  'help',
  'support',
  'terms',
  'privacy',
  'about',
  'contact',
  'login',
  'signup',
  'register',
  'inbox',
  'dashboard',
  'settings',
  'profile',
  'home',
  'index',
  'null',
  'undefined',
  'root',
  'system',
  'test',
  'demo',
  'example',
  'info',
  'news',
  'blog',
  'shop',
  'store',
  'mail',
  'email',
  'static',
  'assets',
  'cdn',
  'media',
] as const;

export const COPPA_MIN_AGE = 13;
export const AGE_GATE_YEAR_CUTOFF = new Date().getFullYear() - COPPA_MIN_AGE;

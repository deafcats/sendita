import { increment, get, setWithTtl } from '../redis';
import { RATE_LIMIT } from '@anon-inbox/shared';
import type { RateLimitInfo } from '@anon-inbox/shared';

const RATE_LIMIT_DISABLED = process.env['DISABLE_RATE_LIMIT'] === 'true';

const ALLOWED: RateLimitInfo = {
  allowed: true,
  remaining: 9999,
  resetAt: new Date(Date.now() + 3600000),
  requiresCaptcha: false,
};

export async function checkIpPerInboxLimit(
  ipHash: string,
  inboxSlug: string,
): Promise<RateLimitInfo> {
  if (RATE_LIMIT_DISABLED) return ALLOWED;
  const key = `rl:ip-inbox:${ipHash}:${inboxSlug}`;
  const count = await increment(key, RATE_LIMIT.IP_PER_INBOX_WINDOW_SECONDS);
  const allowed = count <= RATE_LIMIT.IP_PER_INBOX_COUNT;
  return {
    allowed,
    remaining: Math.max(0, RATE_LIMIT.IP_PER_INBOX_COUNT - count),
    resetAt: new Date(
      Date.now() + RATE_LIMIT.IP_PER_INBOX_WINDOW_SECONDS * 1000,
    ),
    requiresCaptcha: false,
  };
}

export async function checkIpGlobalLimit(
  ipHash: string,
): Promise<RateLimitInfo> {
  if (RATE_LIMIT_DISABLED) return ALLOWED;
  const key = `rl:ip-global:${ipHash}`;
  const count = await increment(key, RATE_LIMIT.IP_GLOBAL_WINDOW_SECONDS);
  const allowed = count <= RATE_LIMIT.IP_GLOBAL_COUNT;
  return {
    allowed,
    remaining: Math.max(0, RATE_LIMIT.IP_GLOBAL_COUNT - count),
    resetAt: new Date(Date.now() + RATE_LIMIT.IP_GLOBAL_WINDOW_SECONDS * 1000),
    requiresCaptcha: false,
  };
}

export async function checkFingerprintLimit(
  fingerprintHash: string,
): Promise<RateLimitInfo> {
  if (RATE_LIMIT_DISABLED) return ALLOWED;
  const key = `rl:fp:${fingerprintHash}`;
  const violationsKey = `rl:fp-violations:${fingerprintHash}`;
  const captchaKey = `rl:captcha-required:${fingerprintHash}`;

  // Check if CAPTCHA is already required
  const captchaRequired = await get(captchaKey);

  const count = await increment(
    key,
    RATE_LIMIT.FINGERPRINT_GLOBAL_WINDOW_SECONDS,
  );
  const allowed = count <= RATE_LIMIT.FINGERPRINT_GLOBAL_COUNT;

  if (!allowed) {
    const violations = await increment(
      violationsKey,
      RATE_LIMIT.CAPTCHA_LOCK_SECONDS,
    );
    if (violations >= RATE_LIMIT.CAPTCHA_VIOLATION_THRESHOLD) {
      await setWithTtl(captchaKey, '1', RATE_LIMIT.CAPTCHA_LOCK_SECONDS);
    }
  }

  return {
    allowed,
    remaining: Math.max(0, RATE_LIMIT.FINGERPRINT_GLOBAL_COUNT - count),
    resetAt: new Date(
      Date.now() + RATE_LIMIT.FINGERPRINT_GLOBAL_WINDOW_SECONDS * 1000,
    ),
    requiresCaptcha: captchaRequired === '1',
  };
}

export async function checkPerInboxLimit(
  inboxOwnerId: string,
): Promise<{ allowed: boolean; throttled: boolean }> {
  if (RATE_LIMIT_DISABLED) return { allowed: true, throttled: false };
  const key = `rl:inbox:${inboxOwnerId}`;
  const count = await increment(key, RATE_LIMIT.INBOX_HOURLY_WINDOW_SECONDS);

  if (count <= RATE_LIMIT.INBOX_HOURLY_COUNT) {
    return { allowed: true, throttled: false };
  }

  // Hot inbox: still accept but throttle to delayed queue
  return { allowed: true, throttled: true };
}

export async function isShadowBanned(
  fingerprintHash: string,
): Promise<boolean> {
  const key = `shadowban:${fingerprintHash}`;
  const result = await get(key);
  return result !== null;
}

export async function shadowBan(
  fingerprintHash: string,
  permanentIpHash?: string,
): Promise<void> {
  const key = `shadowban:${fingerprintHash}`;
  // 24h temporary by default; permanent if admin promotes
  await setWithTtl(key, '1', 24 * 60 * 60);

  if (permanentIpHash) {
    await setWithTtl(`shadowban-permanent:${permanentIpHash}`, '1', 365 * 24 * 60 * 60);
  }
}

export async function requiresCaptcha(
  fingerprintHash: string,
): Promise<boolean> {
  const captchaKey = `rl:captcha-required:${fingerprintHash}`;
  const result = await get(captchaKey);
  return result === '1';
}

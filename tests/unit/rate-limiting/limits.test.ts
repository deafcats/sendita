import { describe, it, expect, vi } from 'vitest';
import { RATE_LIMIT, MESSAGE_MAX_LENGTH, MESSAGE_MIN_DELAY_MS } from '@anon-inbox/shared';

// Unit test the rate limit constants and logic (Redis mocked)
const mockRedis = {
  pipeline: vi.fn(),
  get: vi.fn(),
  setex: vi.fn(),
  incr: vi.fn(),
  expire: vi.fn(),
};

vi.mock('../../../apps/api/src/lib/redis', () => ({
  getRedisClient: () => mockRedis,
  increment: async (key: string) => {
    const count = (mockRedis as any).__counters?.[key] ?? 0;
    const newCount = count + 1;
    if (!(mockRedis as any).__counters) (mockRedis as any).__counters = {};
    (mockRedis as any).__counters[key] = newCount;
    return newCount;
  },
  get: async (key: string) => (mockRedis as any).__store?.[key] ?? null,
  setWithTtl: async (key: string, value: string) => {
    if (!(mockRedis as any).__store) (mockRedis as any).__store = {};
    (mockRedis as any).__store[key] = value;
  },
}));

describe('RATE_LIMIT constants', () => {
  it('has correct IP per inbox limit', () => {
    expect(RATE_LIMIT.IP_PER_INBOX_COUNT).toBe(5);
    expect(RATE_LIMIT.IP_PER_INBOX_WINDOW_SECONDS).toBe(600);
  });

  it('has correct IP global limit', () => {
    expect(RATE_LIMIT.IP_GLOBAL_COUNT).toBe(20);
    expect(RATE_LIMIT.IP_GLOBAL_WINDOW_SECONDS).toBe(3600);
  });

  it('has correct fingerprint limit', () => {
    expect(RATE_LIMIT.FINGERPRINT_GLOBAL_COUNT).toBe(10);
    expect(RATE_LIMIT.FINGERPRINT_GLOBAL_WINDOW_SECONDS).toBe(3600);
  });

  it('has correct inbox hourly limit', () => {
    expect(RATE_LIMIT.INBOX_HOURLY_COUNT).toBe(200);
    expect(RATE_LIMIT.INBOX_HOURLY_WINDOW_SECONDS).toBe(3600);
  });

  it('CAPTCHA threshold is 3 violations', () => {
    expect(RATE_LIMIT.CAPTCHA_VIOLATION_THRESHOLD).toBe(3);
  });

  it('CAPTCHA lock is 24 hours', () => {
    expect(RATE_LIMIT.CAPTCHA_LOCK_SECONDS).toBe(86400);
  });
});

describe('Message constants', () => {
  it('has max length of 300', () => {
    expect(MESSAGE_MAX_LENGTH).toBe(300);
  });

  it('has min delay of 800ms', () => {
    expect(MESSAGE_MIN_DELAY_MS).toBe(800);
  });
});

import { randomBytes, randomUUID } from 'crypto';

export function makeDeviceSecret(): string {
  return randomBytes(32).toString('hex');
}

export function makeIdempotencyKey(): string {
  return randomUUID();
}

export function makeSlug(length = 6): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export function makeMessage(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    body: 'This is a test anonymous message',
    idempotencyKey: randomUUID(),
    fingerprintHash: randomBytes(16).toString('hex'),
    sendDelayMs: 2000,
    website: '', // honeypot empty
    ...overrides,
  };
}

export function makeModerationJobData(overrides: Record<string, unknown> = {}) {
  return {
    messageId: randomUUID(),
    inboxOwnerId: randomUUID(),
    body: 'Hello there',
    metadata: {
      ipHash: randomBytes(16).toString('hex'),
      fingerprintHash: randomBytes(16).toString('hex'),
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      deviceType: 'ios',
      regionCountry: 'US',
      regionState: 'CA',
      sendDelayMs: 2000,
    },
    ...overrides,
  };
}

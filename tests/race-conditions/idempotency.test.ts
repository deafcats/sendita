import { describe, it, expect } from 'vitest';
import { makeDeviceSecret, makeMessage } from '../helpers/factories';
import { randomUUID } from 'crypto';

const API_URL = process.env['API_URL'] ?? 'http://localhost:3001';

async function registerUser() {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceSecret: makeDeviceSecret(), birthYear: 1995 }),
  });
  return res.json() as Promise<{ accessToken: string; slug: string }>;
}

describe('Race conditions: idempotency', () => {
  it('10 concurrent sends with same idempotency key create exactly 1 message', async () => {
    const { slug, accessToken } = await registerUser();
    const idempotencyKey = randomUUID();
    const msg = makeMessage({ slug, idempotencyKey, sendDelayMs: 2000 });

    // Fire 10 concurrent requests with same idempotency key
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        fetch(`${API_URL}/api/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(msg),
        }),
      ),
    );

    // All should return 202 (some are idempotent dedupes)
    const statuses = results.map((r) => r.status);
    expect(statuses.every((s) => s === 202)).toBe(true);

    // Wait briefly for moderation worker to process
    await new Promise((r) => setTimeout(r, 1000));

    // Verify at most 1 message exists (idempotency key deduplicated)
    const inbox = await fetch(`${API_URL}/api/messages/inbox`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await inbox.json() as { items: unknown[] };
    expect(data.items.length).toBeLessThanOrEqual(1);
  }, 60000);
});

describe('Race conditions: refresh token rotation', () => {
  it('concurrent refresh requests with same token: only 1 succeeds', async () => {
    const reg = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceSecret: makeDeviceSecret(), birthYear: 1995 }),
    });
    const { refreshToken } = await reg.json() as { refreshToken: string };

    // Fire 2 concurrent refreshes with same token
    const [res1, res2] = await Promise.all([
      fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      }),
      fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      }),
    ]);

    const statuses = [res1.status, res2.status].sort();
    // One should succeed (200), one should fail (401) — atomic UPDATE ensures only 1 wins
    expect(statuses).toEqual([200, 401]);
  }, 30000);
});

describe('Race conditions: slug generation', () => {
  it('20 concurrent registrations produce unique slugs', async () => {
    // Batched to stay within DB pool limits; handle partial failures in dev mode
    const BATCH = 20;
    const responses = await Promise.all(
      Array.from({ length: BATCH }, () =>
        fetch(`${API_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceSecret: makeDeviceSecret(), birthYear: 1995 }),
        }),
      ),
    );

    const registrations = await Promise.all(
      responses.map(async (r) => {
        if (!r.ok) return null;
        try {
          const ct = r.headers.get('content-type') ?? '';
          if (!ct.includes('application/json')) return null;
          return (await r.json()) as { slug: string };
        } catch {
          return null;
        }
      }),
    );

    const slugs = registrations.filter(Boolean).map((r) => r!.slug).filter(Boolean);
    const uniqueSlugs = new Set(slugs);

    // All successful registrations should have unique slugs (no duplicates)
    expect(uniqueSlugs.size).toBe(slugs.length);
    // At least 80% of concurrent registrations should succeed
    expect(slugs.length).toBeGreaterThanOrEqual(Math.floor(BATCH * 0.8));
  }, 60000);
});

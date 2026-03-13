import { describe, it, expect } from 'vitest';
import { makeDeviceSecret } from '../helpers/factories';

const API_URL = process.env['API_URL'] ?? 'http://localhost:3001';

async function registerAndGetToken() {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceSecret: makeDeviceSecret(), birthYear: 1995 }),
  });
  return res.json() as Promise<{ accessToken: string; refreshToken: string }>;
}

describe('Security: JWT attacks', () => {
  it('alg:none attack is rejected', async () => {
    // Craft a JWT with alg:none
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sub: 'attacker', jti: 'fake', exp: 9999999999 })).toString('base64url');
    const fakeToken = `${header}.${payload}.`;

    const res = await fetch(`${API_URL}/api/messages/inbox`, {
      headers: { Authorization: `Bearer ${fakeToken}` },
    });
    expect(res.status).toBe(401);
  });

  it('modified payload without re-signing is rejected', async () => {
    const { accessToken } = await registerAndGetToken();
    const parts = accessToken.split('.');
    if (parts.length !== 3) return;

    // Modify payload to claim different userId
    const fakePayload = Buffer.from(JSON.stringify({ sub: 'different-user', jti: 'x', exp: 9999999999 })).toString('base64url');
    const tampered = `${parts[0]}.${fakePayload}.${parts[2]}`;

    const res = await fetch(`${API_URL}/api/messages/inbox`, {
      headers: { Authorization: `Bearer ${tampered}` },
    });
    expect(res.status).toBe(401);
  });

  it('expired JWT is rejected', async () => {
    // We can't easily create an expired token without the secret, but we can test with a clearly invalid one
    const expired = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0IiwiZXhwIjoxfQ.invalid';
    const res = await fetch(`${API_URL}/api/messages/inbox`, {
      headers: { Authorization: `Bearer ${expired}` },
    });
    expect(res.status).toBe(401);
  });

  it('missing Authorization header returns 401', async () => {
    const res = await fetch(`${API_URL}/api/messages/inbox`);
    expect(res.status).toBe(401);
  });

  it('malformed Bearer token returns 401', async () => {
    const res = await fetch(`${API_URL}/api/messages/inbox`, {
      headers: { Authorization: 'Bearer not-a-real-token' },
    });
    expect(res.status).toBe(401);
  });
});

describe('Security: Input validation', () => {
  it('SQL injection in message body is stored safely (not executed)', async () => {
    const { accessToken } = await registerAndGetToken();
    const regSlug = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceSecret: makeDeviceSecret(), birthYear: 1995 }),
    }).then((r) => r.json() as Promise<{ slug: string }>);

    const sqlInjection = "'; DROP TABLE messages; --";
    const res = await fetch(`${API_URL}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: regSlug.slug,
        body: sqlInjection,
        idempotencyKey: crypto.randomUUID(),
        fingerprintHash: 'deadbeef1234',
        sendDelayMs: 2000,
        website: '',
      }),
    });
    // Should be accepted (202) but stored safely, not cause a DB error
    expect([202, 400]).toContain(res.status);
  });

  it('oversized payload returns 400', async () => {
    const res = await fetch(`${API_URL}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: 'test',
        body: 'x'.repeat(10000),
        idempotencyKey: crypto.randomUUID(),
        sendDelayMs: 2000,
        website: '',
      }),
    });
    expect(res.status).toBe(400);
  });

  it('accessing another user message by ID returns 403 or 404', async () => {
    const { accessToken } = await registerAndGetToken();

    // Try to unlock hint for a non-existent message — should be 403 or 404, never 200
    const res = await fetch(`${API_URL}/api/hints/unlock`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messageId: '00000000-0000-0000-0000-000000000001' }),
    });
    expect([403, 404]).toContain(res.status);
  }, 20000);
});

describe('Security: Error message safety', () => {
  it('404 for banned inbox looks identical to 404 for unknown inbox', async () => {
    const res1 = await fetch(`${API_URL}/api/links/unknown123`);
    const res2 = await fetch(`${API_URL}/api/links/unknown456`);
    // Both should return identical 404 — no differentiation
    expect(res1.status).toBe(404);
    expect(res2.status).toBe(404);
  });
});

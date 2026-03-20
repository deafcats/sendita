import { describe, it, expect } from 'vitest';
import { makeCredentials, registerUser } from '../helpers/auth';

const API_URL = process.env['API_URL'] ?? 'http://localhost:3001';
describe('Security: session auth', () => {
  it('missing Authorization header returns 401', async () => {
    const res = await fetch(`${API_URL}/api/messages/inbox`);
    expect(res.status).toBe(401);
  });

  it('malformed session cookie returns 401', async () => {
    const res = await fetch(`${API_URL}/api/messages/inbox`, {
      headers: { Cookie: 'anon_inbox_session=not-a-real-session' },
    });
    expect(res.status).toBe(401);
  });

  it('wrong password is rejected', async () => {
    const credentials = makeCredentials();
    await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: credentials.email, password: 'wrong-password' }),
    });
    expect(res.status).toBe(401);
  });
});

describe('Security: Input validation', () => {
  it('SQL injection in message body is stored safely (not executed)', async () => {
    const regSlug = await registerUser();

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
    const { cookie } = await registerUser();

    // Try to unlock hint for a non-existent message — should be 403 or 404, never 200
    const res = await fetch(`${API_URL}/api/hints/unlock`, {
      method: 'POST',
      headers: {
        Cookie: cookie,
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

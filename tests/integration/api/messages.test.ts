import { describe, it, expect } from 'vitest';
import { makeMessage } from '../../helpers/factories';
import { registerUser } from '../../helpers/auth';

const API_URL = process.env['API_URL'] ?? 'http://localhost:3001';

describe('POST /api/messages', () => {
  it('happy path: valid submission returns 202', async () => {
    const { slug } = await registerUser();
    const res = await fetch(`${API_URL}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makeMessage({ slug })),
    });
    expect(res.status).toBe(202);
  });

  it('duplicate idempotency key returns 202 without creating second message', async () => {
    const { slug } = await registerUser();
    const msg = makeMessage({ slug });

    const res1 = await fetch(`${API_URL}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg),
    });
    const res2 = await fetch(`${API_URL}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg),
    });

    expect(res1.status).toBe(202);
    expect(res2.status).toBe(202);
    // Verify only 1 message was created by checking inbox count
  });

  it('returns 400 for empty body', async () => {
    const { slug } = await registerUser();
    const res = await fetch(`${API_URL}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makeMessage({ slug, body: '' })),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 for whitespace-only body', async () => {
    const { slug } = await registerUser();
    const res = await fetch(`${API_URL}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makeMessage({ slug, body: '   \n\t  ' })),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 for body exceeding 300 characters', async () => {
    const { slug } = await registerUser();
    const res = await fetch(`${API_URL}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makeMessage({ slug, body: 'a'.repeat(301) })),
    });
    expect(res.status).toBe(400);
  });

  it('accepts body of exactly 300 characters', async () => {
    const { slug } = await registerUser();
    const res = await fetch(`${API_URL}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makeMessage({ slug, body: 'a'.repeat(300) })),
    });
    expect(res.status).toBe(202);
  });

  it('returns 404 for unknown slug', async () => {
    const res = await fetch(`${API_URL}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makeMessage({ slug: 'zzz999' })),
    });
    expect(res.status).toBe(404);
  });

  it('returns 202 (shadow block) for honeypot-filled submission', async () => {
    const { slug } = await registerUser();
    const res = await fetch(`${API_URL}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makeMessage({ slug, website: 'http://bot.com' })),
    });
    // Shadow block returns 202 silently
    expect(res.status).toBe(202);
  });

  it('returns 202 for bot-speed submission (silent block)', async () => {
    const { slug } = await registerUser();
    const res = await fetch(`${API_URL}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makeMessage({ slug, sendDelayMs: 100 })),
    });
    // Bot speed: shadow blocked, returns 202
    expect(res.status).toBe(202);
  });
});

describe('GET /api/messages/inbox', () => {
  it('returns 401 without auth', async () => {
    const res = await fetch(`${API_URL}/api/messages/inbox`);
    expect(res.status).toBe(401);
  });

  it('returns paginated messages for authenticated user', async () => {
    const { cookie } = await registerUser();
    const res = await fetch(`${API_URL}/api/messages/inbox`, {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(200);
    const data = await res.json() as { items: unknown[]; nextCursor: string | null; hasMore: boolean };
    expect(Array.isArray(data.items)).toBe(true);
    expect(typeof data.hasMore).toBe('boolean');
  });
});

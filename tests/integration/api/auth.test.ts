import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { makeDeviceSecret } from '../../helpers/factories';

const API_URL = process.env['API_URL'] ?? 'http://localhost:3001';

describe('POST /api/auth/register', () => {
  it('returns 201 with accessToken, refreshToken, userId, slug', async () => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceSecret: makeDeviceSecret(),
        birthYear: 1995,
        displayName: 'Test User',
      }),
    });
    expect(res.status).toBe(201);
    const data = await res.json() as Record<string, unknown>;
    expect(data['accessToken']).toBeDefined();
    expect(data['refreshToken']).toBeDefined();
    expect(data['slug']).toMatch(/^[a-z0-9]{6}$/);
  });

  it('returns 403 when birth year indicates user is under 13', async () => {
    const underageYear = new Date().getFullYear() - 10;
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceSecret: makeDeviceSecret(),
        birthYear: underageYear,
      }),
    });
    expect(res.status).toBe(403);
    const data = await res.json() as { code: string };
    expect(data.code).toBe('AGE_GATE_FAILED');
  });

  it('returns 400 for invalid JSON', async () => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when deviceSecret is missing', async () => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ birthYear: 1995 }),
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/refresh', () => {
  it('returns new accessToken and rotated refreshToken', async () => {
    // Register first
    const reg = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceSecret: makeDeviceSecret(), birthYear: 1995 }),
    });
    const { refreshToken } = await reg.json() as { refreshToken: string };

    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    expect(res.status).toBe(200);
    const data = await res.json() as { accessToken: string; refreshToken: string };
    expect(data.accessToken).toBeDefined();
    expect(data.refreshToken).toBeDefined();
    expect(data.refreshToken).not.toBe(refreshToken); // rotated
  });

  it('returns 401 for replayed refresh token', async () => {
    const reg = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceSecret: makeDeviceSecret(), birthYear: 1995 }),
    });
    const { refreshToken } = await reg.json() as { refreshToken: string };

    // First use — should succeed
    await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    // Second use of same token — should fail (replay attack)
    const res2 = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    expect(res2.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('returns 200 and subsequent authenticated requests fail', async () => {
    const reg = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceSecret: makeDeviceSecret(), birthYear: 1995 }),
    });
    const { accessToken } = await reg.json() as { accessToken: string };

    const logoutRes = await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(logoutRes.status).toBe(200);

    // Now the token should be in the blocklist
    const inboxRes = await fetch(`${API_URL}/api/messages/inbox`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(inboxRes.status).toBe(401);
  });
});

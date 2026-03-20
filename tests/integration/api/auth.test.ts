import { describe, it, expect } from 'vitest';
import { makeCredentials, extractSessionCookie, registerUser } from '../../helpers/auth';
import { randomUUID } from 'crypto';

const API_URL = process.env['API_URL'] ?? 'http://localhost:3001';

describe('POST /api/auth/register', () => {
  it('returns 201 with a session cookie and user payload', async () => {
    const credentials = makeCredentials();
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    expect(res.status).toBe(201);
    const data = await res.json() as Record<string, unknown>;
    expect((data['user'] as Record<string, unknown>)['slug']).toBe(credentials.username);
    expect((data['user'] as Record<string, unknown>)['isEmailVerified']).toBe(false);
    expect(typeof data['verificationPreviewUrl']).toBe('string');
    expect(extractSessionCookie(res)).toContain('anon_inbox_session=');
  });

  it('returns 400 for invalid JSON', async () => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when password is missing', async () => {
    const credentials = makeCredentials();
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: credentials.username,
        email: credentials.email,
        displayName: credentials.displayName,
      }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when username is reserved', async () => {
    const credentials = makeCredentials();
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...credentials,
        username: 'login',
      }),
    });

    expect(res.status).toBe(400);
    const data = await res.json() as { code: string };
    expect(data.code).toBe('INVALID_USERNAME');
  });
});

describe('GET /api/auth/username', () => {
  it('returns available for a free username', async () => {
    const username = `claim-${randomUUID().slice(0, 8)}`;
    const res = await fetch(`${API_URL}/api/auth/username?username=${username}`);

    expect(res.status).toBe(200);
    const data = await res.json() as {
      username: string;
      available: boolean;
      reason: string | null;
      suggestions: string[];
    };
    expect(data.username).toBe(username);
    expect(data.available).toBe(true);
    expect(data.reason).toBeNull();
    expect(data.suggestions).toEqual([]);
  });

  it('returns taken with alternatives for an existing username', async () => {
    const credentials = makeCredentials();
    await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    const res = await fetch(`${API_URL}/api/auth/username?username=${credentials.username}`);

    expect(res.status).toBe(200);
    const data = await res.json() as {
      username: string;
      available: boolean;
      reason: string | null;
      suggestions: string[];
    };
    expect(data.username).toBe(credentials.username);
    expect(data.available).toBe(false);
    expect(data.reason).toBe('TAKEN');
    expect(data.suggestions.length).toBeGreaterThan(0);
    expect(data.suggestions).not.toContain(credentials.username);
  });

  it('returns reserved with alternatives for a reserved username', async () => {
    const res = await fetch(`${API_URL}/api/auth/username?username=login`);

    expect(res.status).toBe(200);
    const data = await res.json() as {
      username: string;
      available: boolean;
      reason: string | null;
      suggestions: string[];
    };
    expect(data.username).toBe('login');
    expect(data.available).toBe(false);
    expect(data.reason).toBe('RESERVED');
    expect(data.suggestions.length).toBeGreaterThan(0);
  });
});

describe('POST /api/auth/login', () => {
  it('returns 200 with a fresh session cookie', async () => {
    const credentials = makeCredentials();
    await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: credentials.email, password: credentials.password }),
    });
    expect(res.status).toBe(200);
    expect(extractSessionCookie(res)).toContain('anon_inbox_session=');
  });
});

describe('POST /api/auth/verify-email', () => {
  it('resends a verification email for an authenticated user', async () => {
    const user = await registerUser();
    const res = await fetch(`${API_URL}/api/auth/verify-email`, {
      method: 'POST',
      headers: {
        Cookie: user.cookie,
      },
    });

    expect(res.status).toBe(200);
    const data = await res.json() as { ok: boolean; previewUrl?: string };
    expect(data.ok).toBe(true);
    expect(typeof data.previewUrl).toBe('string');
  });

  it('verifies the email token and redirects back to the inbox', async () => {
    const credentials = makeCredentials();
    const registerRes = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    const registerData = await registerRes.json() as { verificationPreviewUrl?: string };

    expect(registerData.verificationPreviewUrl).toBeTruthy();

    const verifyRes = await fetch(registerData.verificationPreviewUrl!, {
      redirect: 'manual',
    });

    expect(verifyRes.status).toBe(307);
    expect(verifyRes.headers.get('location')).toContain('/dashboard/messages?verify=success');
  });
});

describe('POST /api/auth/logout', () => {
  it('returns 200 and subsequent authenticated requests fail', async () => {
    const credentials = makeCredentials();
    const reg = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    const cookie = extractSessionCookie(reg);

    const logoutRes = await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: cookie },
    });
    expect(logoutRes.status).toBe(200);

    const inboxRes = await fetch(`${API_URL}/api/messages/inbox`, {
      headers: { Cookie: cookie },
    });
    expect(inboxRes.status).toBe(401);
  });
});

describe('PUT /api/dashboard/settings', () => {
  it('allows a user to set a username', async () => {
    const user = await registerUser();
    const vanitySlug = `jake-${randomUUID().slice(0, 8)}`;
    const res = await fetch(`${API_URL}/api/dashboard/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: user.cookie,
      },
      body: JSON.stringify({
        displayName: 'Test User',
        slug: vanitySlug,
        blockedKeywords: '',
        flaggedKeywords: '',
        requireReviewForUnknownLinks: false,
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json() as { slug: string; username?: string; publicLink: string };
    expect(data.slug).toBe(vanitySlug);
    expect(data.username).toBe(vanitySlug);
    expect(data.publicLink).toContain(`/${vanitySlug}`);
  });

  it('rejects reserved usernames', async () => {
    const user = await registerUser();
    const res = await fetch(`${API_URL}/api/dashboard/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: user.cookie,
      },
      body: JSON.stringify({
        displayName: 'Test User',
        slug: 'admin',
        blockedKeywords: '',
        flaggedKeywords: '',
        requireReviewForUnknownLinks: false,
      }),
    });

    expect(res.status).toBe(400);
    const data = await res.json() as { code: string };
    expect(data.code).toBe('INVALID_SLUG');
  });

  it('rejects a username that is already taken', async () => {
    const firstUser = await registerUser();
    const secondUser = await registerUser();
    const vanitySlug = `jake-${randomUUID().slice(0, 8)}`;

    await fetch(`${API_URL}/api/dashboard/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: firstUser.cookie,
      },
      body: JSON.stringify({
        displayName: 'Test User',
        slug: vanitySlug,
        blockedKeywords: '',
        flaggedKeywords: '',
        requireReviewForUnknownLinks: false,
      }),
    });

    const res = await fetch(`${API_URL}/api/dashboard/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: secondUser.cookie,
      },
      body: JSON.stringify({
        displayName: 'Test User',
        slug: vanitySlug,
        blockedKeywords: '',
        flaggedKeywords: '',
        requireReviewForUnknownLinks: false,
      }),
    });

    expect(res.status).toBe(400);
    const data = await res.json() as { code: string };
    expect(data.code).toBe('SLUG_TAKEN');
  });
});

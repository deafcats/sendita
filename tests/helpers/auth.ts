import { randomUUID } from 'crypto';

const API_URL = process.env['API_URL'] ?? 'http://localhost:3001';

export function makeCredentials() {
  const id = randomUUID();
  return {
    email: `user-${id}@example.com`,
    password: `Pass-${id}-123456`,
    displayName: 'Test User',
    username: `user-${id.slice(0, 8)}`,
  };
}

export function extractSessionCookie(res: Response): string {
  const cookieHeader = res.headers.get('set-cookie');
  if (!cookieHeader) {
    throw new Error('Expected session cookie in response');
  }

  const [cookie] = cookieHeader.split(';');
  if (!cookie) {
    throw new Error('Invalid session cookie');
  }
  return cookie;
}

export async function registerUser() {
  const credentials = makeCredentials();
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  if (!res.ok) {
    throw new Error(`Registration failed: ${res.status}`);
  }

  const data = (await res.json()) as { user: { id: string; slug: string; email: string; displayName: string } };
  return {
    ...data.user,
    cookie: extractSessionCookie(res),
    credentials,
  };
}

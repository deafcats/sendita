import * as SecureStore from 'expo-secure-store';
import { randomBytes, createHash } from 'crypto';

const DEVICE_SECRET_KEY = 'device_secret';
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_ID_KEY = 'user_id';
const USER_SLUG_KEY = 'user_slug';

const API_URL = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3001';

export function generateDeviceSecret(): string {
  return randomBytes(32).toString('hex');
}

export async function storeDeviceSecret(secret: string): Promise<void> {
  await SecureStore.setItemAsync(DEVICE_SECRET_KEY, secret, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function getDeviceSecret(): Promise<string | null> {
  return SecureStore.getItemAsync(DEVICE_SECRET_KEY);
}

export async function storeTokens(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
  ]);
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function storeUserInfo(userId: string, slug: string): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(USER_ID_KEY, userId),
    SecureStore.setItemAsync(USER_SLUG_KEY, slug),
  ]);
}

export async function getUserInfo(): Promise<{ userId: string; slug: string } | null> {
  const [userId, slug] = await Promise.all([
    SecureStore.getItemAsync(USER_ID_KEY),
    SecureStore.getItemAsync(USER_SLUG_KEY),
  ]);
  if (!userId || !slug) return null;
  return { userId, slug };
}

export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return null;

    const data = await res.json() as { accessToken: string; refreshToken: string };
    await storeTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

export async function authenticatedFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  let token = await getAccessToken();

  const makeRequest = (t: string) =>
    fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${t}`,
        'Content-Type': 'application/json',
      },
    });

  if (!token) throw new Error('Not authenticated');

  let res = await makeRequest(token);

  // Token expired — try refresh
  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (!newToken) throw new Error('Session expired');
    token = newToken;
    res = await makeRequest(token);
  }

  return res;
}

export async function clearAuth(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(USER_ID_KEY),
    SecureStore.deleteItemAsync(USER_SLUG_KEY),
  ]);
}

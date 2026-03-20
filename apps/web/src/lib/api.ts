'use client';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

export interface SessionUser {
  id: string;
  slug: string;
  email: string | null;
  displayName: string | null;
  isEmailVerified: boolean;
}

export interface DashboardMessage {
  id: string;
  body: string;
  status: 'approved' | 'flagged' | 'blocked' | 'shadow_blocked' | 'pending';
  isRead: boolean;
  isAutomated: boolean;
  createdAt: string;
}

export interface UsernameAvailability {
  username: string;
  available: boolean;
  reason: 'EMPTY' | 'INVALID' | 'RESERVED' | 'TAKEN' | null;
  message: string;
  suggestions: string[];
}

async function apiFetch(path: string, init?: RequestInit) {
  return fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
}

export async function registerUser(payload: {
  username: string;
  email: string;
  password: string;
  displayName: string;
}) {
  const res = await apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? 'Failed to create account');
  }
  return res.json() as Promise<{ user: SessionUser; verificationPreviewUrl?: string }>;
}

export async function checkUsernameAvailability(username: string) {
  const res = await apiFetch(`/api/auth/username?username=${encodeURIComponent(username)}`, {
    method: 'GET',
  });
  if (!res.ok) {
    throw new Error('Failed to check username');
  }
  return res.json() as Promise<UsernameAvailability>;
}

export async function loginUser(payload: { email: string; password: string }) {
  const res = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? 'Failed to log in');
  }
  return res.json() as Promise<{ user: SessionUser }>;
}

export async function fetchSession() {
  const res = await apiFetch('/api/auth/session', { method: 'GET' });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error('Failed to load session');
  return res.json() as Promise<{ user: SessionUser }>;
}

export async function resendVerificationEmail() {
  const res = await apiFetch('/api/auth/verify-email', { method: 'POST' });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? 'Failed to resend verification email');
  }
  return res.json() as Promise<{ ok: true; alreadyVerified?: boolean; previewUrl?: string }>;
}

export async function logoutUser() {
  const res = await apiFetch('/api/auth/logout', { method: 'POST' });
  if (!res.ok) throw new Error('Failed to log out');
}

export async function fetchInboxMessages(cursor?: string) {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  const res = await apiFetch(`/api/messages/inbox${query}`, { method: 'GET' });
  if (!res.ok) throw new Error('Failed to load questions');
  return res.json() as Promise<{
    items: DashboardMessage[];
    nextCursor: string | null;
    hasMore: boolean;
  }>;
}

export async function fetchMessage(id: string) {
  const res = await apiFetch(`/api/messages/${id}`, { method: 'GET' });
  if (!res.ok) throw new Error('Failed to load question');
  return res.json() as Promise<DashboardMessage>;
}

export async function updateMessage(
  id: string,
  payload: { isRead?: boolean; status?: 'approved' | 'flagged' | 'blocked' },
) {
  const res = await apiFetch(`/api/messages/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to update question');
  return res.json() as Promise<DashboardMessage>;
}

export async function fetchAnalytics() {
  const res = await apiFetch('/api/dashboard/analytics', { method: 'GET' });
  if (!res.ok) throw new Error('Failed to load analytics');
  return res.json() as Promise<{
    totalQuestions: number;
    unreadQuestions: number;
    flaggedQuestions: number;
    blockedQuestions: number;
    approvedQuestions: number;
  }>;
}

export async function fetchSettings() {
  const res = await apiFetch('/api/dashboard/settings', { method: 'GET' });
  if (!res.ok) throw new Error('Failed to load settings');
  return res.json() as Promise<{
    email: string | null;
    slug: string;
    username?: string;
    displayName: string | null;
    blockedKeywords: string;
    flaggedKeywords: string;
    requireReviewForUnknownLinks: boolean;
    publicLink: string;
  }>;
}

export async function updateSettings(payload: {
  displayName: string;
  slug?: string;
  blockedKeywords: string;
  flaggedKeywords: string;
  requireReviewForUnknownLinks: boolean;
}) {
  const res = await apiFetch('/api/dashboard/settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? 'Failed to save settings');
  }
  return res.json() as Promise<{
    email: string | null;
    slug: string;
    username?: string;
    displayName: string | null;
    blockedKeywords: string;
    flaggedKeywords: string;
    requireReviewForUnknownLinks: boolean;
    publicLink: string;
  }>;
}

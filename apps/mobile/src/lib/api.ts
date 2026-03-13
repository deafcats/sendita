import { authenticatedFetch } from './auth';
import type { PaginatedResponse, Message } from '@anon-inbox/shared';

const API_URL = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3001';

export async function fetchInboxMessages(cursor?: string): Promise<PaginatedResponse<Message>> {
  const url = cursor
    ? `${API_URL}/api/messages/inbox?cursor=${encodeURIComponent(cursor)}`
    : `${API_URL}/api/messages/inbox`;

  const res = await authenticatedFetch(url);
  if (!res.ok) throw new Error('Failed to fetch messages');
  return res.json() as Promise<PaginatedResponse<Message>>;
}

export async function unlockHint(
  messageId: string,
): Promise<{ hints: Record<string, string | boolean>; alreadyUnlocked: boolean }> {
  const res = await authenticatedFetch(`${API_URL}/api/hints/unlock`, {
    method: 'POST',
    body: JSON.stringify({ messageId }),
  });

  if (res.status === 402) throw new Error('PAYMENT_REQUIRED');
  if (!res.ok) throw new Error('Failed to unlock hint');
  return res.json() as Promise<{ hints: Record<string, string | boolean>; alreadyUnlocked: boolean }>;
}

export async function reportMessage(
  messageId: string,
  reason: string,
): Promise<void> {
  const res = await authenticatedFetch(`${API_URL}/api/reports`, {
    method: 'POST',
    body: JSON.stringify({ messageId, reason }),
  });
  if (!res.ok) throw new Error('Failed to submit report');
}

export async function updatePushToken(pushToken: string): Promise<void> {
  const res = await authenticatedFetch(`${API_URL}/api/users/push-token`, {
    method: 'PATCH',
    body: JSON.stringify({ pushToken }),
  });
  if (!res.ok) throw new Error('Failed to update push token');
}

export async function deleteAccount(): Promise<void> {
  const res = await authenticatedFetch(`${API_URL}/api/users/delete`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete account');
}

export function formatHint(key: string, value: string | boolean): string {
  switch (key) {
    case 'device':
      if (value === 'iPhone') return 'Sent from an iPhone';
      if (value === 'Android') return 'Sent from an Android';
      if (value === 'desktop') return 'Sent from a computer';
      return `Sent from ${value}`;
    case 'region':
      if (value === 'nearby') return 'Sent from nearby';
      if (value === 'same_country') return 'Sent from your country';
      return 'Sent from a similar location';
    case 'fastSend':
      return 'Sent quickly after opening your link';
    case 'repeatSender':
      return 'This person has messaged you before';
    default:
      return String(value);
  }
}

import type { Message } from '@anon-inbox/shared';

/**
 * Lightweight in-memory store for passing complex objects between Expo Router
 * screens without URL serialization. Only used for the currently-selected message.
 */
let selectedMessage: Message | null = null;

export function setSelectedMessage(m: Message) {
  selectedMessage = m;
}

export function getSelectedMessage(): Message | null {
  return selectedMessage;
}

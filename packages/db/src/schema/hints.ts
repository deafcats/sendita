import {
  pgTable,
  uuid,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { messages } from './messages';

export const hintUnlocks = pgTable(
  'hint_unlocks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    messageId: uuid('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // Encrypted JSONB: { device?, region?, fastSend?, repeatSender? }
    hintsRevealed: jsonb('hints_revealed').notNull(),
    unlockedAt: timestamp('unlocked_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('hint_unlocks_message_user_idx').on(
      table.messageId,
      table.userId,
    ),
    index('hint_unlocks_user_id_idx').on(table.userId),
  ],
);

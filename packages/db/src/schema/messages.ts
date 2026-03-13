import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  char,
  varchar,
  index,
  uniqueIndex,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const messageStatusEnum = pgEnum('message_status', [
  'pending',
  'approved',
  'flagged',
  'blocked',
  'shadow_blocked',
]);

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    inboxOwnerId: uuid('inbox_owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    status: messageStatusEnum('status').notNull().default('pending'),
    isRead: boolean('is_read').notNull().default(false),
    isAutomated: boolean('is_automated').notNull().default(false),
    idempotencyKey: text('idempotency_key').unique(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('messages_inbox_owner_created_at_idx').on(
      table.inboxOwnerId,
      table.createdAt,
    ),
    index('messages_inbox_owner_id_idx').on(table.inboxOwnerId, table.id),
    index('messages_status_idx').on(table.status),
    uniqueIndex('messages_idempotency_key_idx').on(table.idempotencyKey),
  ],
);

export const messageMetadata = pgTable(
  'message_metadata',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    messageId: uuid('message_id')
      .notNull()
      .unique()
      .references(() => messages.id, { onDelete: 'cascade' }),
    ipHash: text('ip_hash'),
    fingerprintHash: text('fingerprint_hash'),
    userAgent: text('user_agent'),
    deviceType: varchar('device_type', { length: 20 }),
    browser: varchar('browser', { length: 30 }),
    regionCountry: char('region_country', { length: 2 }),
    regionState: varchar('region_state', { length: 50 }),
    sendDelayMs: integer('send_delay_ms'),
    purgeAfter: timestamp('purge_after', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('message_metadata_fingerprint_hash_idx').on(table.fingerprintHash),
    index('message_metadata_ip_hash_idx').on(table.ipHash),
    index('message_metadata_purge_after_idx').on(table.purgeAfter),
  ],
);

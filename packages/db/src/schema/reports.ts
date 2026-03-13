import {
  pgTable,
  uuid,
  timestamp,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { messages } from './messages';

export const reportReasonEnum = pgEnum('report_reason', [
  'harassment',
  'spam',
  'hate',
  'self_harm',
  'csam',
  'other',
]);

export const reportStatusEnum = pgEnum('report_status', [
  'pending',
  'reviewed',
  'actioned',
  'dismissed',
]);

export const reports = pgTable(
  'reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    messageId: uuid('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    reportedBy: uuid('reported_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    reason: reportReasonEnum('reason').notNull(),
    status: reportStatusEnum('status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('reports_status_idx').on(table.status),
    index('reports_message_id_idx').on(table.messageId),
    index('reports_reason_status_idx').on(table.reason, table.status),
  ],
);

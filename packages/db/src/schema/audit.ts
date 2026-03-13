import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';

// Indefinitely retained audit log for admin actions and CSAM events
export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    action: text('action').notNull(),
    adminId: uuid('admin_id'),
    targetId: uuid('target_id'),
    targetType: text('target_type'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('audit_log_action_idx').on(table.action),
    index('audit_log_admin_id_idx').on(table.adminId),
    index('audit_log_target_idx').on(table.targetId, table.targetType),
    index('audit_log_created_at_idx').on(table.createdAt),
  ],
);

// CSAM reports — never purged
export const csamReports = pgTable(
  'csam_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    messageId: uuid('message_id').notNull(),
    messageContentHash: text('message_content_hash').notNull(),
    moderationScore: text('moderation_score'),
    ipHash: text('ip_hash'),
    ncmecReportId: text('ncmec_report_id'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    status: text('status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('csam_reports_status_idx').on(table.status),
    index('csam_reports_created_at_idx').on(table.createdAt),
  ],
);

import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 20 }).notNull().unique(),
    email: varchar('email', { length: 255 }),
    passwordHash: text('password_hash'),
    displayName: varchar('display_name', { length: 50 }),
    avatarUrl: text('avatar_url'),
    deviceSecretHash: text('device_secret_hash'),
    pushToken: text('push_token'),
    pushTokenValid: boolean('push_token_valid').notNull().default(true),
    recoveryEmailHash: text('recovery_email_hash'),
    blockedKeywords: text('blocked_keywords').notNull().default(''),
    flaggedKeywords: text('flagged_keywords').notNull().default(''),
    requireReviewForUnknownLinks: boolean('require_review_for_unknown_links')
      .notNull()
      .default(false),
    isPremium: boolean('is_premium').notNull().default(false),
    premiumExpiresAt: timestamp('premium_expires_at', { withTimezone: true }),
    isBanned: boolean('is_banned').notNull().default(false),
    ageConfirmedAt: timestamp('age_confirmed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('users_slug_idx').on(table.slug),
    uniqueIndex('users_email_idx').on(table.email),
    index('users_deleted_at_idx').on(table.deletedAt),
  ],
);

export const deviceSessions = pgTable(
  'device_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    refreshTokenHash: text('refresh_token_hash').notNull(),
    jti: text('jti').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (table) => [
    index('device_sessions_user_id_idx').on(table.userId),
    index('device_sessions_jti_idx').on(table.jti),
  ],
);

export const userSessions = pgTable(
  'user_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sessionTokenHash: text('session_token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('user_sessions_session_token_hash_idx').on(table.sessionTokenHash),
    index('user_sessions_user_id_idx').on(table.userId),
  ],
);

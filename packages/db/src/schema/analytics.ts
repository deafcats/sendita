import {
  pgTable,
  uuid,
  varchar,
  char,
  timestamp,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';

export const analyticsEventTypeEnum = pgEnum('analytics_event_type', [
  'link_view',
  'message_sent',
  'hint_unlocked',
  'premium_converted',
  'app_install_referral',
]);

export const analyticsEvents = pgTable(
  'analytics_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventType: analyticsEventTypeEnum('event_type').notNull(),
    slug: varchar('slug', { length: 20 }),
    regionCountry: char('region_country', { length: 2 }),
    deviceType: varchar('device_type', { length: 20 }),
    // Only set for owner-initiated events (hint_unlocked, premium_converted)
    userId: uuid('user_id'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('analytics_events_type_created_at_idx').on(
      table.eventType,
      table.createdAt,
    ),
    index('analytics_events_slug_idx').on(table.slug),
  ],
);

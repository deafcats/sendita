import {
  pgTable,
  uuid,
  text,
  varchar,
  boolean,
  integer,
  index,
} from 'drizzle-orm/pg-core';

export const engagementPrompts = pgTable(
  'engagement_prompts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    body: text('body').notNull(),
    category: varchar('category', { length: 30 }),
    isActive: boolean('is_active').notNull().default(true),
    usageCount: integer('usage_count').notNull().default(0),
  },
  (table) => [index('engagement_prompts_active_usage_idx').on(table.isActive, table.usageCount)],
);

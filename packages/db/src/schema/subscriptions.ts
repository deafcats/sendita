import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const subscriptionPlanEnum = pgEnum('subscription_plan', [
  'monthly',
  'annual',
]);

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active',
  'past_due',
  'cancelled',
  'grace',
]);

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    stripeCustomerId: text('stripe_customer_id'),
    stripeSubId: text('stripe_sub_id'),
    plan: subscriptionPlanEnum('plan'),
    status: subscriptionStatusEnum('status').notNull().default('cancelled'),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    hintCredits: integer('hint_credits').notNull().default(0),
    gracePeriodEnd: timestamp('grace_period_end', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('subscriptions_user_id_idx').on(table.userId),
    index('subscriptions_stripe_customer_id_idx').on(table.stripeCustomerId),
    index('subscriptions_stripe_sub_id_idx').on(table.stripeSubId),
    index('subscriptions_status_idx').on(table.status),
  ],
);

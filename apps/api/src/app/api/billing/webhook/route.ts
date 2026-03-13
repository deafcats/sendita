import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { getPrimaryClient } from '@anon-inbox/db';
import { users, subscriptions } from '@anon-inbox/db';
import { SUBSCRIPTION_GRACE_PERIOD_DAYS } from '@anon-inbox/shared';
import { getGracePeriodExpiryQueue } from '@anon-inbox/queue';

function getStripe() {
  const key = process.env['STRIPE_SECRET_KEY'];
  if (!key) throw new Error('STRIPE_SECRET_KEY not set');
  return new Stripe(key);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const stripe = getStripe();
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = process.env['STRIPE_WEBHOOK_SECRET'];

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const db = getPrimaryClient();

  switch (event.type) {
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
      if (!customerId) break;

      const periodEnd = invoice.period_end
        ? new Date(invoice.period_end * 1000)
        : null;

      await db
        .update(subscriptions)
        .set({
          status: 'active',
          currentPeriodEnd: periodEnd,
          gracePeriodEnd: null,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.stripeCustomerId, customerId));

      // Restore premium flag on user
      const [sub] = await db
        .select({ userId: subscriptions.userId })
        .from(subscriptions)
        .where(eq(subscriptions.stripeCustomerId, customerId))
        .limit(1);

      if (sub) {
        await db
          .update(users)
          .set({ isPremium: true, premiumExpiresAt: periodEnd })
          .where(eq(users.id, sub.userId));
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
      if (!customerId) break;

      const gracePeriodEnd = new Date(
        Date.now() + SUBSCRIPTION_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000,
      );

      await db
        .update(subscriptions)
        .set({ status: 'past_due', gracePeriodEnd, updatedAt: new Date() })
        .where(eq(subscriptions.stripeCustomerId, customerId));

      // Schedule grace period expiry job
      const [sub] = await db
        .select({ id: subscriptions.id, userId: subscriptions.userId })
        .from(subscriptions)
        .where(eq(subscriptions.stripeCustomerId, customerId))
        .limit(1);

      if (sub) {
        const queue = getGracePeriodExpiryQueue();
        await queue.add(
          'expire-grace',
          { userId: sub.userId, subscriptionId: sub.id },
          { delay: SUBSCRIPTION_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000 },
        );
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
      if (!customerId) break;

      await db
        .update(subscriptions)
        .set({ status: 'cancelled', updatedAt: new Date() })
        .where(eq(subscriptions.stripeCustomerId, customerId));

      const [userSub] = await db
        .select({ userId: subscriptions.userId })
        .from(subscriptions)
        .where(eq(subscriptions.stripeCustomerId, customerId))
        .limit(1);

      if (userSub) {
        await db
          .update(users)
          .set({ isPremium: false, premiumExpiresAt: null })
          .where(eq(users.id, userSub.userId));
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}

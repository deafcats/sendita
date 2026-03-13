import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPrimaryClient } from '@anon-inbox/db';
import { analyticsEvents } from '@anon-inbox/db';

const eventSchema = z.object({
  eventType: z.enum([
    'link_view',
    'message_sent',
    'hint_unlocked',
    'premium_converted',
    'app_install_referral',
  ]),
  slug: z.string().max(20).optional(),
  regionCountry: z.string().length(2).optional(),
  deviceType: z.string().max(20).optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid event data' }, { status: 400 });
  }

  const { eventType, slug, regionCountry, deviceType } = parsed.data;

  // Get region from Vercel geo headers (trusted) if not provided
  const resolvedCountry =
    regionCountry ??
    req.headers.get('x-vercel-ip-country') ??
    undefined;

  try {
    const db = getPrimaryClient();
    await db.insert(analyticsEvents).values({
      eventType,
      slug: slug ?? null,
      regionCountry: resolvedCountry ?? null,
      deviceType: deviceType ?? null,
    });

    // Also forward to Tinybird for real-time analytics
    const tinybirdKey = process.env['TINYBIRD_API_KEY'];
    const tinybirdUrl = process.env['TINYBIRD_API_URL'];
    if (tinybirdKey && tinybirdUrl) {
      // Fire and forget — don't await
      fetch(`${tinybirdUrl}/v0/events?name=analytics_events`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tinybirdKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventType,
          slug: slug ?? null,
          regionCountry: resolvedCountry ?? null,
          deviceType: deviceType ?? null,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {});
    }
  } catch (err) {
    console.error('Analytics event error:', err);
  }

  return NextResponse.json({ success: true }, { status: 202 });
}

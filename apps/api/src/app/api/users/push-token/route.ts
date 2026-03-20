import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getPrimaryClient } from '@anon-inbox/db';
import { users } from '@anon-inbox/db';
import { withAuth, badRequest } from '@/lib/middleware';

const schema = z.object({
  pushToken: z.string().min(1).max(512),
});

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  return withAuth(req, async (_req, user) => {
    const userId = user.id;
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest('Invalid JSON');
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) return badRequest('Invalid pushToken');

    const db = getPrimaryClient();
    await db
      .update(users)
      .set({ pushToken: parsed.data.pushToken, pushTokenValid: true })
      .where(eq(users.id, userId));

    return NextResponse.json({ success: true });
  });
}

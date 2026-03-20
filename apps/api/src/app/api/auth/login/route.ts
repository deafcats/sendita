import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getPrimaryClient } from '@anon-inbox/db';
import { users } from '@anon-inbox/db';
import { verifySecret } from '@/lib/auth/device';
import { badRequest, unauthorized } from '@/lib/middleware';
import { buildSessionCookie, createUserSession } from '@/lib/auth/session';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON');
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.message);
  }

  const db = getPrimaryClient();
  const [user] = await db
    .select({
      id: users.id,
      slug: users.slug,
      email: users.email,
      displayName: users.displayName,
      emailVerifiedAt: users.emailVerifiedAt,
      passwordHash: users.passwordHash,
      isBanned: users.isBanned,
      deletedAt: users.deletedAt,
    })
    .from(users)
    .where(eq(users.email, parsed.data.email.toLowerCase()))
    .limit(1);

  if (!user || !user.passwordHash || user.isBanned || user.deletedAt) {
    return unauthorized('Invalid email or password');
  }

  const validPassword = await verifySecret(parsed.data.password, user.passwordHash);
  if (!validPassword) {
    return unauthorized('Invalid email or password');
  }

  const sessionToken = await createUserSession(user.id);
  const response = NextResponse.json({
    user: {
      id: user.id,
      slug: user.slug,
      email: user.email,
      displayName: user.displayName,
      isEmailVerified: Boolean(user.emailVerifiedAt),
    },
  });
  response.cookies.set(buildSessionCookie(sessionToken));

  return response;
}

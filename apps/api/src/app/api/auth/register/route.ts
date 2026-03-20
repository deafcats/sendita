import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPrimaryClient } from '@anon-inbox/db';
import { users } from '@anon-inbox/db';
import { eq } from 'drizzle-orm';
import { hashSecret } from '@/lib/auth/device';
import { buildSessionCookie, createUserSession } from '@/lib/auth/session';
import { isValidVanitySlug, sanitizeSlugInput } from '@/lib/slugs/index';
import { badRequest, serverError } from '@/lib/middleware';

const registerSchema = z.object({
  username: z.string().min(4).max(20),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  displayName: z.string().min(1).max(50),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON');
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.message);
  }

  const { username, email, password, displayName } = parsed.data;
  const slug = sanitizeSlugInput(username);

  if (!isValidVanitySlug(slug)) {
    return badRequest(
      'Username must be 4-20 characters using letters, numbers, or hyphens, and cannot be reserved',
      'INVALID_USERNAME',
    );
  }

  const db = getPrimaryClient();

  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  if (existingUser) {
    return badRequest('Email is already in use', 'EMAIL_TAKEN');
  }

  const [existingSlug] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.slug, slug))
    .limit(1);

  if (existingSlug) {
    return badRequest('Username is already in use', 'USERNAME_TAKEN');
  }

  const passwordHash = await hashSecret(password);

  try {
    const [user] = await db
      .insert(users)
      .values({
        slug,
        email: email.toLowerCase(),
        displayName,
        passwordHash,
      })
      .returning({
        id: users.id,
        slug: users.slug,
        email: users.email,
        displayName: users.displayName,
      });

    if (!user) throw new Error('User creation failed');

    const sessionToken = await createUserSession(user.id);
    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          slug: user.slug,
          email: user.email,
          displayName: user.displayName,
        },
      },
      { status: 201 },
    );
    response.cookies.set(buildSessionCookie(sessionToken));

    return response;
  } catch (err) {
    console.error('Registration error:', err);
    return serverError();
  }
}

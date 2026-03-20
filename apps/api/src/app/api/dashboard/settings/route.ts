import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getPrimaryClient } from '@anon-inbox/db';
import { users } from '@anon-inbox/db';
import { badRequest, withAuth } from '@/lib/middleware';
import { isValidVanitySlug, sanitizeSlugInput } from '@/lib/slugs';

const updateSettingsSchema = z.object({
  displayName: z.string().min(1).max(50),
  slug: z.string().min(1).max(20).optional(),
  blockedKeywords: z.string().max(5000),
  flaggedKeywords: z.string().max(5000),
  requireReviewForUnknownLinks: z.boolean(),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  return withAuth(req, async (_req, user) =>
    NextResponse.json({
      email: user.email,
      slug: user.slug,
      username: user.slug,
      displayName: user.displayName,
      blockedKeywords: user.blockedKeywords,
      flaggedKeywords: user.flaggedKeywords,
      requireReviewForUnknownLinks: user.requireReviewForUnknownLinks,
      publicLink: `${process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'}/${user.slug}`,
    }),
  );
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  return withAuth(req, async (_req, user) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest('Invalid JSON');
    }

    const parsed = updateSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.message);
    }

    const nextSlug = parsed.data.slug
      ? sanitizeSlugInput(parsed.data.slug)
      : user.slug;

    if (!isValidVanitySlug(nextSlug)) {
      return badRequest(
        'Personal link must be 4-20 characters using letters, numbers, or hyphens, and cannot be reserved',
        'INVALID_SLUG',
      );
    }

    const db = getPrimaryClient();
    if (nextSlug !== user.slug) {
      const [existingUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.slug, nextSlug))
        .limit(1);

      if (existingUser && existingUser.id !== user.id) {
        return badRequest('That personal link is already taken', 'SLUG_TAKEN');
      }
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        displayName: parsed.data.displayName,
        slug: nextSlug,
        blockedKeywords: parsed.data.blockedKeywords,
        flaggedKeywords: parsed.data.flaggedKeywords,
        requireReviewForUnknownLinks: parsed.data.requireReviewForUnknownLinks,
      })
      .where(eq(users.id, user.id))
      .returning({
        email: users.email,
        slug: users.slug,
        displayName: users.displayName,
        blockedKeywords: users.blockedKeywords,
        flaggedKeywords: users.flaggedKeywords,
        requireReviewForUnknownLinks: users.requireReviewForUnknownLinks,
      });

    return NextResponse.json({
      ...updatedUser,
      username: updatedUser?.slug,
      publicLink: `${process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'}/${updatedUser?.slug}`,
    });
  });
}

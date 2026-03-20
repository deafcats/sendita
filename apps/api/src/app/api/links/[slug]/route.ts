import { NextRequest, NextResponse } from 'next/server';
import { eq, isNull } from 'drizzle-orm';
import { getReplicaClient } from '@anon-inbox/db';
import { users } from '@anon-inbox/db';
import { notFound } from '@/lib/middleware';
import { getRedisClient } from '@/lib/redis';

const CACHE_TTL = 60; // seconds

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;

  if (!slug || slug.length > 20) return notFound();

  // Check Redis cache first
  const redis = getRedisClient();
  const cacheKey = `profile:${slug}`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    try {
      return NextResponse.json(JSON.parse(cached), {
        headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=30' },
      });
    } catch {
      await redis.del(cacheKey);
    }
  }

  const db = getReplicaClient();
  const [owner] = await db
    .select({
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      slug: users.slug,
    })
    .from(users)
    .where(eq(users.slug, slug))
    .limit(1);

  if (!owner) return notFound();

  // Also check ban/deletion status
  const [fullUser] = await db
    .select({ isBanned: users.isBanned, deletedAt: users.deletedAt, id: users.id })
    .from(users)
    .where(eq(users.slug, slug))
    .limit(1);

  if (!fullUser || fullUser.isBanned || fullUser.deletedAt) {
    // Return 404 — don't differentiate banned vs unknown
    return notFound();
  }

  const profile = {
    displayName: owner.displayName,
    avatarUrl: owner.avatarUrl,
    slug: owner.slug,
  };

  await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(profile));

  return NextResponse.json(profile, {
    headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=30' },
  });
}

import { randomBytes, createHash } from 'crypto';
import { cookies } from 'next/headers';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { getPrimaryClient } from '@anon-inbox/db';
import { userSessions, users } from '@anon-inbox/db';

export const SESSION_COOKIE_NAME = 'anon_inbox_session';
const SESSION_TTL_DAYS = 30;

export interface SessionUser {
  id: string;
  slug: string;
  email: string | null;
  displayName: string | null;
  isEmailVerified: boolean;
  blockedKeywords: string;
  flaggedKeywords: string;
  requireReviewForUnknownLinks: boolean;
}

export function generateSessionToken(): string {
  return randomBytes(48).toString('base64url');
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function getSessionExpiry(): Date {
  return new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export async function createUserSession(userId: string): Promise<string> {
  const db = getPrimaryClient();
  const sessionToken = generateSessionToken();
  const sessionTokenHash = hashSessionToken(sessionToken);

  await db.insert(userSessions).values({
    userId,
    sessionTokenHash,
    expiresAt: getSessionExpiry(),
  });

  return sessionToken;
}

export function buildSessionCookie(token: string, expiresAt?: Date) {
  const secure = process.env['NODE_ENV'] === 'production';
  return {
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: secure ? ('none' as const) : ('lax' as const),
    secure,
    path: '/',
    expires: expiresAt ?? getSessionExpiry(),
  };
}

export async function getSessionTokenFromCookies(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export async function getSessionUserByToken(
  sessionToken: string | null,
): Promise<SessionUser | null> {
  if (!sessionToken) return null;

  const db = getPrimaryClient();
  const sessionTokenHash = hashSessionToken(sessionToken);

  const [session] = await db
    .select({
      userId: userSessions.userId,
    })
    .from(userSessions)
    .where(
      and(
        eq(userSessions.sessionTokenHash, sessionTokenHash),
        isNull(userSessions.revokedAt),
        sql`${userSessions.expiresAt} > now()`,
      ),
    )
    .limit(1);

  if (!session) return null;

  const [user] = await db
    .select({
      id: users.id,
      slug: users.slug,
      email: users.email,
      displayName: users.displayName,
      emailVerifiedAt: users.emailVerifiedAt,
      blockedKeywords: users.blockedKeywords,
      flaggedKeywords: users.flaggedKeywords,
      requireReviewForUnknownLinks: users.requireReviewForUnknownLinks,
      isBanned: users.isBanned,
      deletedAt: users.deletedAt,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!user || user.isBanned || user.deletedAt) {
    return null;
  }

  return {
    id: user.id,
    slug: user.slug,
    email: user.email,
    displayName: user.displayName,
    isEmailVerified: Boolean(user.emailVerifiedAt),
    blockedKeywords: user.blockedKeywords,
    flaggedKeywords: user.flaggedKeywords,
    requireReviewForUnknownLinks: user.requireReviewForUnknownLinks,
  };
}

export async function revokeSession(sessionToken: string | null): Promise<void> {
  if (!sessionToken) return;

  const db = getPrimaryClient();
  const sessionTokenHash = hashSessionToken(sessionToken);

  await db
    .update(userSessions)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(userSessions.sessionTokenHash, sessionTokenHash),
        isNull(userSessions.revokedAt),
      ),
    );
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  const db = getPrimaryClient();
  await db
    .update(userSessions)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(userSessions.userId, userId),
        isNull(userSessions.revokedAt),
      ),
    );
}

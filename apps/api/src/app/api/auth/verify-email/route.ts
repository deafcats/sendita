import { NextRequest, NextResponse } from 'next/server';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { getPrimaryClient, users } from '@anon-inbox/db';
import { issueEmailVerification, sendVerificationEmail, hashEmailVerificationToken } from '@/lib/auth/email-verification';
import { badRequest, withAuth } from '@/lib/middleware';

function getDashboardMessagesUrl() {
  return `${process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'}/dashboard/messages`;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return badRequest('Verification token is required', 'MISSING_TOKEN');
  }

  const db = getPrimaryClient();
  const tokenHash = hashEmailVerificationToken(token);

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.emailVerificationTokenHash, tokenHash),
        isNull(users.emailVerifiedAt),
        sql`${users.emailVerificationExpiresAt} > now()`,
      ),
    )
    .limit(1);

  if (!user) {
    return NextResponse.redirect(`${getDashboardMessagesUrl()}?verify=invalid`);
  }

  await db
    .update(users)
    .set({
      emailVerifiedAt: new Date(),
      emailVerificationTokenHash: null,
      emailVerificationExpiresAt: null,
    })
    .where(eq(users.id, user.id));

  return NextResponse.redirect(`${getDashboardMessagesUrl()}?verify=success`);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return withAuth(req, async (_req, user) => {
    if (!user.email) {
      return badRequest('No email is linked to this account', 'EMAIL_MISSING');
    }

    if (user.isEmailVerified) {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }

    const verification = await issueEmailVerification(user.id);
    let emailResult: { sent: boolean; previewUrl?: string };
    try {
      emailResult = await sendVerificationEmail({
        email: user.email,
        displayName: user.displayName,
        username: user.slug,
        verificationUrl: verification.verificationUrl,
      });
    } catch (emailError) {
      console.error('Verification resend error:', emailError);
      emailResult = { sent: false, previewUrl: verification.verificationUrl };
    }

    return NextResponse.json({
      ok: true,
      alreadyVerified: false,
      previewUrl: emailResult.previewUrl,
    });
  });
}

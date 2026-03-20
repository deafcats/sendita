import { createHash, randomBytes } from 'crypto';
import { eq } from 'drizzle-orm';
import { getPrimaryClient, users } from '@anon-inbox/db';

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

export function generateEmailVerificationToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashEmailVerificationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function getEmailVerificationExpiry(): Date {
  return new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);
}

function getApiUrl() {
  return process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
}

function getAppUrl() {
  return process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000';
}

export async function issueEmailVerification(userId: string) {
  const db = getPrimaryClient();
  const token = generateEmailVerificationToken();
  const tokenHash = hashEmailVerificationToken(token);
  const expiresAt = getEmailVerificationExpiry();

  await db
    .update(users)
    .set({
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpiresAt: expiresAt,
    })
    .where(eq(users.id, userId));

  const verificationUrl = `${getApiUrl()}/api/auth/verify-email?token=${encodeURIComponent(token)}`;

  return {
    token,
    tokenHash,
    expiresAt,
    verificationUrl,
  };
}

export async function sendVerificationEmail(input: {
  email: string;
  displayName: string | null;
  username: string;
  verificationUrl: string;
}) {
  const resendApiKey = process.env['RESEND_API_KEY'];
  const emailFrom = process.env['EMAIL_FROM'];
  const subject = 'Verify your Sendita email';
  const creatorName = input.displayName ?? input.username;
  const dashboardUrl = `${getAppUrl()}/dashboard/messages`;

  if (!resendApiKey || !emailFrom) {
    console.info('Email verification preview:', input.verificationUrl);
    return {
      sent: false,
      previewUrl: input.verificationUrl,
    };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: emailFrom,
      to: input.email,
      subject,
      html: `
        <div style="font-family: Inter, Arial, sans-serif; line-height: 1.6; color: #111827;">
          <h1 style="font-size: 22px;">Verify your email</h1>
          <p>Hi ${creatorName},</p>
          <p>Click the button below to verify your email for your Sendita dashboard.</p>
          <p style="margin: 24px 0;">
            <a href="${input.verificationUrl}" style="background:#7c3aed;color:#ffffff;padding:12px 18px;border-radius:12px;text-decoration:none;display:inline-block;">
              Verify email
            </a>
          </p>
          <p>Once verified, jump back into your inbox here:</p>
          <p><a href="${dashboardUrl}">${dashboardUrl}</a></p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Unknown email error');
    throw new Error(`Failed to send verification email: ${errorText}`);
  }

  return {
    sent: true,
    previewUrl: undefined,
  };
}

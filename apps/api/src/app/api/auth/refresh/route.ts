import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import {
  buildSessionCookie,
  getSessionExpiry,
  getSessionTokenFromCookies,
} from '@/lib/auth/session';

export async function POST(req: NextRequest): Promise<NextResponse> {
  return withAuth(req, async () => {
    const sessionToken = req.cookies.get('anon_inbox_session')?.value
      ?? await getSessionTokenFromCookies();
    const response = NextResponse.json({ success: true });
    if (sessionToken) {
      response.cookies.set(buildSessionCookie(sessionToken, getSessionExpiry()));
    }
    return response;
  });
}

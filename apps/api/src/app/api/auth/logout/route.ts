import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import {
  buildSessionCookie,
  getSessionTokenFromCookies,
  revokeSession,
} from '@/lib/auth/session';

export async function POST(req: NextRequest): Promise<NextResponse> {
  return withAuth(req, async () => {
    const sessionToken = req.cookies.get('anon_inbox_session')?.value
      ?? await getSessionTokenFromCookies();
    await revokeSession(sessionToken);

    const response = NextResponse.json({ success: true });
    response.cookies.set({
      ...buildSessionCookie('', new Date(0)),
      maxAge: 0,
    });
    return response;
  });
}

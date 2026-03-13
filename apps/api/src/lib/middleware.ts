import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, type TokenPayload } from './auth/jwt';

export interface AuthenticatedRequest extends NextRequest {
  user: TokenPayload;
}

export function unauthorized(message = 'Unauthorized'): NextResponse {
  return NextResponse.json({ error: message, code: 'UNAUTHORIZED' }, { status: 401 });
}

export function forbidden(message = 'Forbidden'): NextResponse {
  return NextResponse.json({ error: message, code: 'FORBIDDEN' }, { status: 403 });
}

export function badRequest(message: string, code = 'BAD_REQUEST'): NextResponse {
  return NextResponse.json({ error: message, code }, { status: 400 });
}

export function notFound(message = 'Not found'): NextResponse {
  return NextResponse.json({ error: message, code: 'NOT_FOUND' }, { status: 404 });
}

export function tooManyRequests(message = 'Rate limit exceeded'): NextResponse {
  return NextResponse.json({ error: message, code: 'RATE_LIMITED' }, { status: 429 });
}

export function serverError(message = 'Internal server error'): NextResponse {
  return NextResponse.json({ error: message, code: 'INTERNAL_ERROR' }, { status: 500 });
}

export async function withAuth(
  req: NextRequest,
  handler: (req: NextRequest, user: TokenPayload) => Promise<NextResponse>,
): Promise<NextResponse> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return unauthorized();
  }

  const token = authHeader.slice(7);
  try {
    const payload = await verifyAccessToken(token);
    return handler(req, payload);
  } catch {
    return unauthorized('Invalid or expired token');
  }
}

export function getClientIp(req: NextRequest): string {
  // Trust Vercel's geo headers, NOT client-supplied X-Forwarded-For
  return (
    req.headers.get('x-real-ip') ??
    req.headers.get('cf-connecting-ip') ??
    '0.0.0.0'
  );
}

import { NextRequest, NextResponse } from 'next/server';

export function checkAdminAccess(req: NextRequest): boolean {
  const allowlist = (process.env['ADMIN_IP_ALLOWLIST'] ?? '127.0.0.1,::1')
    .split(',')
    .map((ip) => ip.trim());

  const clientIp =
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    '0.0.0.0';

  return allowlist.includes(clientIp);
}

export function withAdminAuth(
  req: NextRequest,
  handler: () => Promise<NextResponse>,
): Promise<NextResponse> {
  if (!checkAdminAccess(req)) {
    return Promise.resolve(
      NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    );
  }
  return handler();
}

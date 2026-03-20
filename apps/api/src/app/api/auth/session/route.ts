import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';

export async function GET(req: NextRequest): Promise<NextResponse> {
  return withAuth(req, async (_req, user) =>
    NextResponse.json({
      user: {
        id: user.id,
        slug: user.slug,
        email: user.email,
        displayName: user.displayName,
      },
    }),
  );
}

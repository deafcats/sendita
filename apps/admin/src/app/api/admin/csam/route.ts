import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getPrimaryClient } from '@anon-inbox/db';
import { csamReports, auditLog } from '@anon-inbox/db';
import { withAdminAuth } from '../lib/ip-allowlist';

const submitSchema = z.object({
  csamReportId: z.string().uuid(),
  ncmecReportId: z.string().min(1),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  return withAdminAuth(req, async () => {
    const db = getPrimaryClient();
    const pending = await db
      .select()
      .from(csamReports)
      .where(eq(csamReports.status, 'pending'))
      .limit(50);

    return NextResponse.json({ reports: pending });
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return withAdminAuth(req, async () => {
    let body: unknown;
    try { body = await req.json(); } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = submitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { csamReportId, ncmecReportId } = parsed.data;
    const db = getPrimaryClient();

    await db
      .update(csamReports)
      .set({
        ncmecReportId,
        submittedAt: new Date(),
        status: 'submitted',
      })
      .where(eq(csamReports.id, csamReportId));

    await db.insert(auditLog).values({
      action: 'csam_submitted_to_ncmec',
      targetId: csamReportId,
      targetType: 'csam_report',
      metadata: { ncmecReportId },
    });

    return NextResponse.json({ success: true });
  });
}

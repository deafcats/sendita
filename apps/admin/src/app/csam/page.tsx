import { eq, desc } from 'drizzle-orm';
import { getPrimaryClient } from '@anon-inbox/db';
import { csamReports } from '@anon-inbox/db';
import { CsamActions } from './CsamActions';

export const dynamic = 'force-dynamic';

async function getPendingReports() {
  const db = getPrimaryClient();
  return db
    .select()
    .from(csamReports)
    .where(eq(csamReports.status, 'pending'))
    .orderBy(desc(csamReports.createdAt))
    .limit(50);
}

export default async function CsamPage() {
  if (!process.env['DATABASE_URL']) {
    return (
      <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl p-8 text-center">
        <div className="text-lg font-semibold text-yellow-300 mb-2">Database not configured</div>
        <p className="text-sm text-yellow-600">Add DATABASE_URL to your Vercel environment variables.</p>
      </div>
    );
  }

  let reports: Awaited<ReturnType<typeof getPendingReports>> = [];
  try {
    reports = await getPendingReports();
  } catch (err) {
    return (
      <div className="bg-red-900/30 border border-red-700 rounded-xl p-8 text-center">
        <div className="text-lg font-semibold text-red-300 mb-2">Database connection failed</div>
        <p className="text-sm text-red-500 font-mono">{String(err)}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100 mb-1">CSAM Report Queue</h1>
        <p className="text-sm text-gray-500">
          Reports pending NCMEC submission. Must be filed within 24 hours of detection.
        </p>
      </div>

      {reports.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">✅</div>
          <div className="text-lg font-semibold text-gray-300 mb-1">No pending reports</div>
          <div className="text-sm text-gray-600">All CSAM reports have been submitted to NCMEC.</div>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const ageHours = Math.round(
              (Date.now() - new Date(report.createdAt).getTime()) / (1000 * 60 * 60)
            );
            const urgent = ageHours >= 20;

            return (
              <div
                key={report.id}
                className={`bg-gray-900 border rounded-xl p-6 ${
                  urgent ? 'border-red-700' : 'border-gray-800'
                }`}
              >
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      {urgent && (
                        <span className="bg-red-900/60 text-red-300 text-xs font-bold px-2.5 py-1 rounded-full border border-red-700 animate-pulse">
                          ⚠ URGENT — {ageHours}h elapsed
                        </span>
                      )}
                      <span className="text-xs text-gray-600">
                        Detected {new Date(report.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="font-mono text-xs text-gray-500 space-y-0.5">
                      <div>report_id: {report.id}</div>
                      <div>message_id: {report.messageId}</div>
                    </div>
                  </div>
                  <CsamActions reportId={report.id} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

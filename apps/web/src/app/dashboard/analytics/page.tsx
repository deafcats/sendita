'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { fetchAnalytics } from '@/lib/api';
import { useDashboardUser } from '@/lib/useDashboardUser';

export default function DashboardAnalyticsPage() {
  const { user, loading, error } = useDashboardUser();
  const [analytics, setAnalytics] = useState<{
    totalQuestions: number;
    unreadQuestions: number;
    flaggedQuestions: number;
    blockedQuestions: number;
    approvedQuestions: number;
  } | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchAnalytics().then(setAnalytics);
  }, [user]);

  if (loading) return <div className="min-h-screen bg-slate-950 p-8 text-white">Loading analytics...</div>;
  if (error || !user) return <div className="min-h-screen bg-slate-950 p-8 text-red-200">{error ?? 'Redirecting...'}</div>;

  return (
    <DashboardShell user={user} title="Analytics">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          ['Total questions', analytics?.totalQuestions ?? 0],
          ['Approved', analytics?.approvedQuestions ?? 0],
          ['Unread', analytics?.unreadQuestions ?? 0],
          ['Flagged', analytics?.flaggedQuestions ?? 0],
          ['Blocked', analytics?.blockedQuestions ?? 0],
        ].map(([label, value]) => (
          <div key={label} className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">{label}</p>
            <p className="mt-2 text-4xl font-semibold text-white">{value}</p>
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}

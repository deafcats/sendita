'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { fetchAnalytics, fetchSettings } from '@/lib/api';
import { useDashboardUser } from '@/lib/useDashboardUser';

export default function DashboardPage() {
  const { user, loading, error } = useDashboardUser();
  const [analytics, setAnalytics] = useState<{
    totalQuestions: number;
    unreadQuestions: number;
    flaggedQuestions: number;
    blockedQuestions: number;
    approvedQuestions: number;
  } | null>(null);
  const [settings, setSettings] = useState<{ publicLink: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    void Promise.all([fetchAnalytics(), fetchSettings()]).then(([analyticsData, settingsData]) => {
      setAnalytics(analyticsData);
      setSettings({ publicLink: settingsData.publicLink });
    });
  }, [user]);

  if (loading) return <div className="min-h-screen bg-slate-950 p-8 text-white">Loading dashboard...</div>;
  if (error || !user) return <div className="min-h-screen bg-slate-950 p-8 text-red-200">{error ?? 'Redirecting...'}</div>;

  return (
    <DashboardShell user={user} title="Overview">
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-sm uppercase tracking-wide text-violet-300">Share this link</p>
          <h2 className="mt-2 text-2xl font-semibold">Your audience question page</h2>
          <p className="mt-2 text-sm text-slate-400">
            Give this link to your viewers so they can submit questions without creating an account.
          </p>
          <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-200">
            {settings?.publicLink ?? `/${user.slug}`}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href={`/${user.slug}`} className="rounded-2xl bg-violet-600 px-4 py-3 text-sm font-medium text-white hover:bg-violet-500">
              Open public page
            </Link>
            <Link href="/dashboard/messages" className="rounded-2xl border border-slate-700 px-4 py-3 text-sm text-slate-200 hover:bg-slate-800">
              Review messages
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: 'Total', value: analytics?.totalQuestions ?? 0 },
            { label: 'Unread', value: analytics?.unreadQuestions ?? 0 },
            { label: 'Flagged', value: analytics?.flaggedQuestions ?? 0 },
            { label: 'Blocked', value: analytics?.blockedQuestions ?? 0 },
          ].map((item) => (
            <div key={item.label} className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <p className="text-sm text-slate-400">{item.label}</p>
              <p className="mt-2 text-3xl font-semibold">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}

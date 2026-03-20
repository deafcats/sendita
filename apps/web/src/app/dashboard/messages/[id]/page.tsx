'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { DashboardShell } from '@/components/DashboardShell';
import { fetchMessage, updateMessage, type DashboardMessage } from '@/lib/api';
import { useDashboardUser } from '@/lib/useDashboardUser';

export default function DashboardMessageDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading, error } = useDashboardUser();
  const [message, setMessage] = useState<DashboardMessage | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    fetchMessage(id).then((data) => {
      setMessage(data);
      if (!data.isRead) {
        void updateMessage(id, { isRead: true }).then(setMessage);
      }
    });
  }, [id, user]);

  if (loading) return <div className="min-h-screen bg-slate-950 p-8 text-white">Loading question...</div>;
  if (error || !user) return <div className="min-h-screen bg-slate-950 p-8 text-red-200">{error ?? 'Redirecting...'}</div>;

  return (
    <DashboardShell user={user} title="Message detail">
      <div className="space-y-6">
        <Link href="/dashboard/messages" className="inline-flex rounded-2xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800">
          Back to inbox
        </Link>

        {message ? (
          <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-violet-950 px-3 py-1 text-xs uppercase tracking-wide text-violet-200">
                {message.status}
              </span>
              <span className="text-sm text-slate-400">
                {new Date(message.createdAt).toLocaleString()}
              </span>
            </div>

            <p className="whitespace-pre-wrap text-lg leading-8 text-slate-100">{message.body}</p>

            <div className="flex flex-wrap gap-3">
              {(['approved', 'flagged', 'blocked'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  disabled={saving}
                  onClick={async () => {
                    if (!id) return;
                    setSaving(true);
                    try {
                      const updated = await updateMessage(id, { status });
                      setMessage(updated);
                    } finally {
                      setSaving(false);
                    }
                  }}
                  className="rounded-2xl border border-slate-700 px-4 py-3 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-60"
                >
                  Mark as {status}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-300">
            Loading message...
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

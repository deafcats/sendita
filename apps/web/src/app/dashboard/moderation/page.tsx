'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { fetchSettings, updateSettings } from '@/lib/api';
import { useDashboardUser } from '@/lib/useDashboardUser';

export default function DashboardModerationPage() {
  const { user, loading, error } = useDashboardUser();
  const [displayName, setDisplayName] = useState('');
  const [blockedKeywords, setBlockedKeywords] = useState('');
  const [flaggedKeywords, setFlaggedKeywords] = useState('');
  const [requireReviewForUnknownLinks, setRequireReviewForUnknownLinks] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!user) return;
    fetchSettings().then((settings) => {
      setDisplayName(settings.displayName ?? '');
      setBlockedKeywords(settings.blockedKeywords);
      setFlaggedKeywords(settings.flaggedKeywords);
      setRequireReviewForUnknownLinks(settings.requireReviewForUnknownLinks);
    });
  }, [user]);

  if (loading) return <div className="min-h-screen bg-slate-950 p-8 text-white">Loading moderation...</div>;
  if (error || !user) return <div className="min-h-screen bg-slate-950 p-8 text-red-200">{error ?? 'Redirecting...'}</div>;

  return (
    <DashboardShell user={user} title="Moderation rules">
      <form
        className="space-y-5 rounded-3xl border border-slate-800 bg-slate-900 p-6"
        onSubmit={async (event) => {
          event.preventDefault();
          setStatus('Saving...');
          try {
            await updateSettings({
              displayName,
              blockedKeywords,
              flaggedKeywords,
              requireReviewForUnknownLinks,
            });
            setStatus('Saved');
          } catch (err) {
            setStatus(err instanceof Error ? err.message : 'Failed to save');
          }
        }}
      >
        <div>
          <h2 className="text-2xl font-semibold text-white">Classic moderation only</h2>
          <p className="mt-2 text-sm text-slate-400">
            Add your own blocked or flagged keywords. No LLM scoring is used.
          </p>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-300">Display name</span>
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-violet-500"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-300">Blocked keywords</span>
          <textarea
            value={blockedKeywords}
            onChange={(event) => setBlockedKeywords(event.target.value)}
            rows={6}
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-violet-500"
            placeholder="one term per line"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-300">Flagged keywords</span>
          <textarea
            value={flaggedKeywords}
            onChange={(event) => setFlaggedKeywords(event.target.value)}
            rows={6}
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-violet-500"
            placeholder="one term per line"
          />
        </label>

        <label className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={requireReviewForUnknownLinks}
            onChange={(event) => setRequireReviewForUnknownLinks(event.target.checked)}
          />
          Flag questions that contain external links
        </label>

        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-slate-400">{status}</p>
          <button
            type="submit"
            className="rounded-2xl bg-violet-600 px-4 py-3 text-sm font-medium text-white hover:bg-violet-500"
          >
            Save rules
          </button>
        </div>
      </form>
    </DashboardShell>
  );
}

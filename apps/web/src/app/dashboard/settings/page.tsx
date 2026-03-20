'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { fetchSettings, updateSettings } from '@/lib/api';
import { useDashboardUser } from '@/lib/useDashboardUser';

export default function DashboardSettingsPage() {
  const { user, loading, error } = useDashboardUser();
  const router = useRouter();
  const [publicLink, setPublicLink] = useState('');
  const [slug, setSlug] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [blockedKeywords, setBlockedKeywords] = useState('');
  const [flaggedKeywords, setFlaggedKeywords] = useState('');
  const [requireReviewForUnknownLinks, setRequireReviewForUnknownLinks] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!user) return;
    fetchSettings().then((settings) => {
      setPublicLink(settings.publicLink);
      setSlug(settings.username ?? settings.slug);
      setDisplayName(settings.displayName ?? '');
      setBlockedKeywords(settings.blockedKeywords);
      setFlaggedKeywords(settings.flaggedKeywords);
      setRequireReviewForUnknownLinks(settings.requireReviewForUnknownLinks);
    });
  }, [user]);

  if (loading) return <div className="min-h-screen bg-slate-950 p-8 text-white">Loading settings...</div>;
  if (error || !user) return <div className="min-h-screen bg-slate-950 p-8 text-red-200">{error ?? 'Redirecting...'}</div>;

  return (
    <DashboardShell user={user} title="Settings">
      <div className="space-y-6 rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <div>
          <h2 className="text-2xl font-semibold text-white">Account</h2>
          <p className="mt-2 text-sm text-slate-400">
            Your dashboard runs on email/password auth and keeps a permanent public question page.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-sm text-slate-400">Display name</p>
            <p className="mt-1 text-white">{displayName || user.displayName || 'Not set'}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-sm text-slate-400">Email</p>
            <p className="mt-1 text-white">{user.email}</p>
          </div>
        </div>

        <form
          className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950 p-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setStatus('Saving...');
            try {
              const updated = await updateSettings({
                displayName: displayName.trim() || user.displayName || 'Jake',
                slug,
                blockedKeywords,
                flaggedKeywords,
                requireReviewForUnknownLinks,
              });
              setDisplayName(updated.displayName ?? '');
              setSlug(updated.slug);
              setPublicLink(updated.publicLink);
              setBlockedKeywords(updated.blockedKeywords);
              setFlaggedKeywords(updated.flaggedKeywords);
              setRequireReviewForUnknownLinks(updated.requireReviewForUnknownLinks);

              if (updated.slug !== user.slug) {
                setStatus('Saved. Reloading your dashboard...');
                setTimeout(() => window.location.reload(), 600);
                return;
              }

              setStatus('Saved');
              router.refresh();
            } catch (err) {
              setStatus(err instanceof Error ? err.message : 'Failed to save settings');
            }
          }}
        >
          <div>
            <p className="text-sm text-slate-400">Personal link</p>
            <p className="mt-1 break-all text-white">{publicLink || `/${slug || user.slug}`}</p>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block text-slate-300">Display name</span>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-violet-500"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-slate-300">Username</span>
            <div className="flex items-center rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3">
              <span className="mr-1 text-slate-500">/</span>
              <input
                value={slug}
                onChange={(event) =>
                  setSlug(
                    event.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, '')
                      .slice(0, 20),
                  )
                }
                className="w-full bg-transparent text-white outline-none"
                minLength={4}
                maxLength={20}
                placeholder="jake"
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Use 4-20 lowercase letters, numbers, or hyphens.
            </p>
          </label>

          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-slate-400">{status}</p>
            <button
              type="submit"
              className="rounded-2xl bg-violet-600 px-4 py-3 text-sm font-medium text-white hover:bg-violet-500"
            >
              Save account settings
            </button>
          </div>
        </form>

        <div className="flex flex-wrap gap-3">
          <Link href={`/${slug || user.slug}`} className="rounded-2xl bg-violet-600 px-4 py-3 text-sm font-medium text-white hover:bg-violet-500">
            Open public page
          </Link>
          <Link href="/dashboard/moderation" className="rounded-2xl border border-slate-700 px-4 py-3 text-sm text-slate-200 hover:bg-slate-800">
            Edit moderation rules
          </Link>
        </div>
      </div>
    </DashboardShell>
  );
}

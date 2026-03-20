'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { registerUser } from '@/lib/api';

const APP_URL = (process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://sendita.app').replace(/^https?:\/\//, '');

export default function RegisterSecurePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const username = searchParams.get('username') ?? '';
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const linkPreview = useMemo(() => `${APP_URL}/${username || 'your-name'}`, [username]);

  useEffect(() => {
    if (!username) {
      router.replace('/register');
    }
  }, [router, username]);

  if (!username) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-white">
      <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <p className="mb-2 text-sm uppercase tracking-wide text-violet-300">Setup step 3</p>
        <h1 className="mb-2 text-3xl font-semibold">Secure your dashboard</h1>
        <p className="mb-6 text-sm text-slate-400">
          Link an email and password so you can own <span className="text-white">{linkPreview}</span>,
          open your inbox, and manage moderation settings.
        </p>

        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setError('');

            if (password !== confirmPassword) {
              setError('Passwords do not match');
              return;
            }

            setLoading(true);
            try {
              await registerUser({
                username,
                displayName: displayName.trim() || username,
                email,
                password,
              });
              router.push('/dashboard/messages?verify=sent');
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Unable to secure dashboard');
            } finally {
              setLoading(false);
            }
          }}
        >
          <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-300">
            Personal link: {linkPreview}
          </div>

          <label className="block text-sm">
            <span className="mb-1 block text-slate-300">Display name</span>
            <input
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-violet-500"
              placeholder="Jake"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-slate-300">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-violet-500"
              required
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-slate-300">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-violet-500"
              minLength={8}
              required
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-slate-300">Confirm password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-violet-500"
              minLength={8}
              required
            />
          </label>

          {error ? (
            <div className="rounded-2xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-violet-600 px-4 py-3 font-medium text-white transition hover:bg-violet-500 disabled:opacity-60"
          >
            {loading ? 'Securing dashboard...' : 'Open my inbox'}
          </button>
        </form>

        <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-400">
          <Link href={`/register/share?username=${encodeURIComponent(username)}`} className="text-violet-300 hover:text-violet-200">
            Back to share step
          </Link>
          <span>We will email a verification link, but you can start using your inbox right away.</span>
        </div>
      </div>
    </div>
  );
}

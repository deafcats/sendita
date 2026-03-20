'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { loginUser } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <p className="mb-2 text-sm uppercase tracking-wide text-violet-300">Jake dashboard</p>
        <h1 className="mb-2 text-3xl font-semibold">Log in</h1>
        <p className="mb-6 text-sm text-slate-400">
          Access your question inbox, moderation rules, and analytics.
        </p>

        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setLoading(true);
            setError('');
            try {
              await loginUser({ email, password });
              router.push('/dashboard');
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Unable to log in');
            } finally {
              setLoading(false);
            }
          }}
        >
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
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-400">
          New here?{' '}
          <Link href="/register" className="text-violet-300 hover:text-violet-200">
            Create your dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}

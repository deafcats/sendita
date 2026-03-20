'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { checkUsernameAvailability, type UsernameAvailability } from '@/lib/api';

const APP_URL = (process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://sendita.app').replace(/^https?:\/\//, '');

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [availability, setAvailability] = useState<UsernameAvailability | null>(null);

  const normalizedUsername = useMemo(
    () =>
      username
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '')
        .slice(0, 20),
    [username],
  );

  useEffect(() => {
    if (!normalizedUsername) {
      setAvailability(null);
      setChecking(false);
      return;
    }

    let cancelled = false;
    setChecking(true);
    setError('');

    const timer = window.setTimeout(async () => {
      try {
        const result = await checkUsernameAvailability(normalizedUsername);
        if (!cancelled) {
          setAvailability(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to check username');
          setAvailability(null);
        }
      } finally {
        if (!cancelled) {
          setChecking(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [normalizedUsername]);

  const statusTone = availability?.available
    ? 'border-emerald-900 bg-emerald-950/40 text-emerald-200'
    : 'border-red-900 bg-red-950/40 text-red-200';

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
      <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <p className="mb-2 text-sm uppercase tracking-wide text-violet-300">Web-first MVP</p>
        <h1 className="mb-2 text-3xl font-semibold">Claim your personal link</h1>
        <p className="mb-6 text-sm text-slate-400">
          Start by choosing the username your audience will type to reach you. We will handle the
          full account setup right after this step.
        </p>

        <form
          className="space-y-5"
          onSubmit={async (event) => {
            event.preventDefault();
            setError('');

            if (!availability?.available) {
              setError('Choose an available username to continue');
              return;
            }

            router.push(`/register/share?username=${encodeURIComponent(availability.username)}`);
          }}
        >
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-sm text-slate-400">Your future public page</p>
            <div className="mt-3 flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-4 text-lg">
              <span className="shrink-0 text-slate-500">{APP_URL}/</span>
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full bg-transparent font-medium outline-none"
                aria-label="Username"
                minLength={4}
                maxLength={20}
                placeholder="jake"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                required
              />
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Use 4-20 lowercase letters, numbers, or hyphens.
            </p>
            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-300">
              Preview: {APP_URL}/{normalizedUsername || 'your-name'}
            </div>
          </div>

          {checking ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-300">
              Checking availability...
            </div>
          ) : availability ? (
            <div className={`rounded-2xl border px-4 py-3 text-sm ${statusTone}`}>
              {availability.message}
            </div>
          ) : null}

          {availability && !availability.available && availability.suggestions.length > 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-sm font-medium text-white">Try one of these instead</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {availability.suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setUsername(suggestion)}
                    className="rounded-full border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-violet-500 hover:text-white"
                  >
                    {APP_URL}/{suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={!availability?.available || checking}
            className="w-full rounded-2xl bg-violet-600 px-4 py-3 font-medium text-white transition hover:bg-violet-500 disabled:opacity-60"
          >
            Continue with this link
          </button>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-400">
            Email and password come in the next setup step. Right now you are just choosing your
            personal link.
          </div>
        </form>

        <p className="mt-6 text-sm text-slate-400">
          Already have an account?{' '}
          <Link href="/login" className="text-violet-300 hover:text-violet-200">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

import Link from 'next/link';
import { redirect } from 'next/navigation';

const APP_URL = (process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://sendita.app').replace(/^https?:\/\//, '');

const templateCards = [
  {
    name: 'Minimal',
    accent: 'from-violet-600 to-fuchsia-500',
    copy: 'Ask me anything tonight',
  },
  {
    name: 'Streamer',
    accent: 'from-cyan-500 to-violet-600',
    copy: 'Drop a question for the stream',
  },
  {
    name: 'Bold',
    accent: 'from-pink-500 to-orange-400',
    copy: 'Send me your hottest take',
  },
];

export default async function RegisterSharePage({
  searchParams,
}: {
  searchParams: Promise<{ username?: string }>;
}) {
  const { username } = await searchParams;

  if (!username) {
    redirect('/register');
  }

  const publicLink = `${APP_URL}/${username}`;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="max-w-2xl">
          <p className="mb-2 text-sm uppercase tracking-[0.2em] text-violet-300">Setup step 2</p>
          <h1 className="text-4xl font-semibold">Share your link</h1>
          <p className="mt-3 text-slate-300">
            This is the personal link you are setting up. Template sharing comes next, so for now
            this screen previews how your future share assets will feel.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
          <p className="text-sm text-slate-400">Your link</p>
          <div className="mt-3 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-4 text-lg font-medium text-white">
            {publicLink}
          </div>
          <p className="mt-3 text-sm text-slate-400">
            It is available right now. We will make it live when the account step is completed.
          </p>
        </div>

        <section>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">Story template previews</h2>
              <p className="mt-2 text-sm text-slate-400">
                One-click Instagram-story sharing is the next step. For now these are visual
                placeholders so the onboarding flow already has the right shape.
              </p>
            </div>
            <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-wide text-slate-400">
              Preview only
            </span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {templateCards.map((template) => (
              <div
                key={template.name}
                className={`rounded-3xl bg-gradient-to-br ${template.accent} p-5 shadow-xl`}
              >
                <div className="rounded-2xl bg-black/15 p-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/70">{template.name}</p>
                  <p className="mt-10 text-2xl font-semibold">{template.copy}</p>
                  <div className="mt-10 rounded-2xl bg-white/15 px-3 py-2 text-sm">
                    {publicLink}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/register"
            className="rounded-2xl border border-slate-700 px-4 py-3 text-sm text-slate-200 hover:bg-slate-800"
          >
            Choose another username
          </Link>
          <button
            type="button"
            disabled
            className="rounded-2xl bg-violet-600 px-4 py-3 text-sm font-medium text-white opacity-60"
          >
            Next: secure your dashboard
          </button>
        </div>

        <p className="text-sm text-slate-500">
          The next step will collect email and password so you can claim the link permanently and
          access your dashboard.
        </p>
      </div>
    </main>
  );
}

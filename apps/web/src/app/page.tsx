import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-20 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <p className="mb-3 text-sm uppercase tracking-[0.2em] text-violet-300">
            Web-first streamer Q&A
          </p>
          <h1 className="text-5xl font-semibold leading-tight">
            Claim your link first. Build the rest of your profile after.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-slate-300">
            Start by choosing the username your audience will type to reach you. Once your link is
            available, you move into the setup flow for sharing, account creation, moderation, and
            your dashboard.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="rounded-2xl bg-violet-600 px-5 py-3 font-medium text-white hover:bg-violet-500">
              Claim your link
            </Link>
            <Link href="/login" className="rounded-2xl border border-slate-700 px-5 py-3 text-slate-200 hover:bg-slate-900">
              Log in
            </Link>
          </div>
        </div>

        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
          <p className="text-sm text-slate-400">Claim your username</p>
          <div className="mt-3 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-4 text-sm text-slate-200">
            https://your-app.com/jake
          </div>
          <div className="mt-6 space-y-3">
            {[
              'Choose a personal link before creating the full account',
              'Get instant availability feedback and alternative suggestions',
              'Preview your share step before email/password setup',
              'Finish with dashboard access, moderation, and analytics',
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-300">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

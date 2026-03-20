'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { logoutUser, type SessionUser } from '@/lib/api';

const links = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/messages', label: 'Messages' },
  { href: '/dashboard/analytics', label: 'Analytics' },
  { href: '/dashboard/moderation', label: 'Moderation' },
  { href: '/dashboard/settings', label: 'Settings' },
];

export function DashboardShell({
  user,
  title,
  children,
}: {
  user: SessionUser;
  title: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-sm text-slate-400">Streamer dashboard</p>
            <h1 className="text-xl font-semibold">{title}</h1>
          </div>
          <div className="text-right">
            <p className="font-medium">{user.displayName ?? user.email ?? user.slug}</p>
            <p className="text-sm text-slate-400">/{user.slug}</p>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:flex-row">
        <aside className="w-full shrink-0 rounded-2xl border border-slate-800 bg-slate-900 p-3 md:w-64">
          <nav className="space-y-1">
            {links.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block rounded-xl px-3 py-2 text-sm transition ${
                    active
                      ? 'bg-violet-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-3">
            <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">Public link</p>
            <p className="break-all text-sm text-slate-200">{`/${user.slug}`}</p>
          </div>

          <button
            type="button"
            onClick={async () => {
              await logoutUser();
              router.push('/login');
            }}
            className="mt-4 w-full rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            Log out
          </button>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

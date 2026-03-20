'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { fetchInboxMessages, type DashboardMessage } from '@/lib/api';
import { useDashboardUser } from '@/lib/useDashboardUser';

type Filter = 'all' | 'approved' | 'flagged' | 'blocked' | 'unread';

export default function DashboardMessagesPage() {
  const { user, loading, error } = useDashboardUser();
  const [messages, setMessages] = useState<DashboardMessage[]>([]);
  const [activeFilter, setActiveFilter] = useState<Filter>('all');
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchInboxMessages()
      .then((data) => setMessages(data.items))
      .finally(() => setPageLoading(false));
  }, [user]);

  const filteredMessages = useMemo(() => {
    switch (activeFilter) {
      case 'approved':
        return messages.filter((message) => message.status === 'approved');
      case 'flagged':
        return messages.filter((message) => message.status === 'flagged');
      case 'blocked':
        return messages.filter((message) => message.status === 'blocked');
      case 'unread':
        return messages.filter((message) => !message.isRead);
      default:
        return messages;
    }
  }, [activeFilter, messages]);

  if (loading) return <div className="min-h-screen bg-slate-950 p-8 text-white">Loading messages...</div>;
  if (error || !user) return <div className="min-h-screen bg-slate-950 p-8 text-red-200">{error ?? 'Redirecting...'}</div>;

  return (
    <DashboardShell user={user} title="Messages">
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          {(['all', 'approved', 'flagged', 'blocked', 'unread'] as Filter[]).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`rounded-full px-4 py-2 text-sm ${
                activeFilter === filter
                  ? 'bg-violet-600 text-white'
                  : 'border border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {pageLoading ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-300">
            Loading inbox...
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-10 text-center">
            <p className="text-4xl">Inbox empty</p>
            <p className="mt-3 text-sm text-slate-400">
              Share your link and incoming questions will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMessages.map((message) => (
              <Link
                key={message.id}
                href={`/dashboard/messages/${message.id}`}
                className={`block rounded-3xl border bg-slate-900 p-5 transition hover:border-violet-500 ${
                  message.isRead ? 'border-slate-800' : 'border-violet-700'
                }`}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-violet-950 px-3 py-1 text-xs uppercase tracking-wide text-violet-200">
                      {message.status}
                    </span>
                    {!message.isRead ? (
                      <span className="rounded-full bg-emerald-950 px-3 py-1 text-xs text-emerald-200">
                        unread
                      </span>
                    ) : null}
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(message.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="line-clamp-3 text-slate-100">{message.body}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

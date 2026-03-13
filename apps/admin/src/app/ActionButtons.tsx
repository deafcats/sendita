'use client';

import { useState, useTransition } from 'react';

type Action = 'approve' | 'block' | 'ban_sender_fingerprint' | 'ban_inbox_owner';

interface Props {
  messageId: string;
  hasFingerprintHash: boolean;
}

export function ActionButtons({ messageId, hasFingerprintHash }: Props) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const take = (action: Action) => {
    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageId, action }),
        });
        if (!res.ok) throw new Error('Request failed');
        setDone(true);
      } catch {
        setError('Action failed — try again');
      }
    });
  };

  if (done) {
    return (
      <div className="shrink-0 text-green-400 text-sm font-medium pt-1">✓ Done</div>
    );
  }

  return (
    <div className="shrink-0 flex flex-col gap-2 pt-1">
      <button
        onClick={() => take('approve')}
        disabled={isPending}
        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-900/50 text-green-400 border border-green-800/50 hover:bg-green-900 transition-colors disabled:opacity-40"
      >
        Approve
      </button>
      <button
        onClick={() => take('block')}
        disabled={isPending}
        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700 transition-colors disabled:opacity-40"
      >
        Block
      </button>
      {hasFingerprintHash && (
        <button
          onClick={() => take('ban_sender_fingerprint')}
          disabled={isPending}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-orange-900/40 text-orange-400 border border-orange-800/50 hover:bg-orange-900/60 transition-colors disabled:opacity-40"
        >
          Ban sender
        </button>
      )}
      <button
        onClick={() => take('ban_inbox_owner')}
        disabled={isPending}
        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-900/40 text-red-400 border border-red-800/50 hover:bg-red-900/60 transition-colors disabled:opacity-40"
      >
        Ban owner
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

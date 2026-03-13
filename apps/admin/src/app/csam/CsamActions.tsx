'use client';

import { useState, useTransition } from 'react';

interface Props {
  reportId: string;
}

export function CsamActions({ reportId }: Props) {
  const [ncmecId, setNcmecId] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!ncmecId.trim()) return;
    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/csam', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ csamReportId: reportId, ncmecReportId: ncmecId.trim() }),
        });
        if (!res.ok) throw new Error('Failed');
        setDone(true);
      } catch {
        setError('Submission failed — try again');
      }
    });
  };

  if (done) {
    return <div className="text-green-400 text-sm font-semibold">✓ Submitted to NCMEC</div>;
  }

  return (
    <div className="shrink-0 flex flex-col gap-2">
      <input
        type="text"
        placeholder="NCMEC Report ID"
        value={ncmecId}
        onChange={(e) => setNcmecId(e.target.value)}
        className="bg-gray-800 border border-gray-700 text-gray-100 text-sm rounded-lg px-3 py-2 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 w-52"
      />
      <button
        onClick={handleSubmit}
        disabled={!ncmecId.trim() || isPending}
        className="px-4 py-2 text-xs font-bold rounded-lg bg-purple-700 text-white hover:bg-purple-600 transition-colors disabled:opacity-40"
      >
        {isPending ? 'Submitting…' : 'Mark submitted to NCMEC'}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

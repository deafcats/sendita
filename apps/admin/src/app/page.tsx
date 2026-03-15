import { eq, desc, count } from 'drizzle-orm';
import { getPrimaryClient } from '@anon-inbox/db';
import { messages, messageMetadata } from '@anon-inbox/db';
import { decrypt } from '@/lib/encryption';
import { ActionButtons } from './ActionButtons';

export const dynamic = 'force-dynamic';

async function getFlaggedMessages() {
  const db = getPrimaryClient();

  const rows = await db
    .select({
      id: messages.id,
      body: messages.body,
      status: messages.status,
      createdAt: messages.createdAt,
      inboxOwnerId: messages.inboxOwnerId,
      ipHash: messageMetadata.ipHash,
      fingerprintHash: messageMetadata.fingerprintHash,
      regionCountry: messageMetadata.regionCountry,
      deviceType: messageMetadata.deviceType,
    })
    .from(messages)
    .leftJoin(messageMetadata, eq(messageMetadata.messageId, messages.id))
    .where(eq(messages.status, 'flagged'))
    .orderBy(desc(messages.createdAt))
    .limit(100);

  return rows.map((m) => {
    let body = m.body;
    try { body = decrypt(m.body); } catch { body = '[decryption failed]'; }
    return { ...m, body };
  });
}

async function getStats() {
  const db = getPrimaryClient();
  const [pending, flagged, blocked] = await Promise.all([
    db.select({ c: count() }).from(messages).where(eq(messages.status, 'pending')),
    db.select({ c: count() }).from(messages).where(eq(messages.status, 'flagged')),
    db.select({ c: count() }).from(messages).where(eq(messages.status, 'blocked')),
  ]);
  return {
    pending: pending[0]?.c ?? 0,
    flagged: flagged[0]?.c ?? 0,
    blocked: blocked[0]?.c ?? 0,
  };
}

export default async function AdminDashboard() {
  if (!process.env['DATABASE_URL']) {
    return (
      <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl p-8 text-center">
        <div className="text-3xl mb-3">⚙️</div>
        <div className="text-lg font-semibold text-yellow-300 mb-2">Database not configured</div>
        <p className="text-sm text-yellow-600 max-w-md mx-auto">
          Add <code className="bg-yellow-900/50 px-1 rounded">DATABASE_URL</code>,{' '}
          <code className="bg-yellow-900/50 px-1 rounded">ENCRYPTION_KEY</code>, and{' '}
          <code className="bg-yellow-900/50 px-1 rounded">REDIS_URL</code> to your Vercel environment
          variables, then redeploy.
        </p>
      </div>
    );
  }

  let flaggedMessages: Awaited<ReturnType<typeof getFlaggedMessages>> = [];
  let stats = { pending: 0, flagged: 0, blocked: 0 };

  try {
    [flaggedMessages, stats] = await Promise.all([getFlaggedMessages(), getStats()]);
  } catch (err) {
    return (
      <div className="bg-red-900/30 border border-red-700 rounded-xl p-8 text-center">
        <div className="text-3xl mb-3">🔴</div>
        <div className="text-lg font-semibold text-red-300 mb-2">Database connection failed</div>
        <p className="text-sm text-red-500 font-mono">{String(err)}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100 mb-1">Flagged Messages</h1>
        <p className="text-sm text-gray-500">Review and take action on messages flagged by the moderation worker.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Pending moderation', value: stats.pending, color: 'text-yellow-400' },
          { label: 'Needs review', value: stats.flagged, color: 'text-red-400' },
          { label: 'Blocked', value: stats.blocked, color: 'text-gray-500' },
        ].map((s) => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className={`text-3xl font-bold mb-1 ${s.color}`}>{s.value}</div>
            <div className="text-sm text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Message list */}
      {flaggedMessages.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">✅</div>
          <div className="text-lg font-semibold text-gray-300 mb-1">Queue is clear</div>
          <div className="text-sm text-gray-600">No flagged messages need review right now.</div>
        </div>
      ) : (
        <div className="space-y-4">
          {flaggedMessages.map((msg) => (
            <div key={msg.id} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Meta */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="inline-flex items-center gap-1 bg-red-900/40 text-red-400 text-xs font-medium px-2.5 py-1 rounded-full border border-red-800/50">
                      ⚑ flagged
                    </span>
                    {msg.deviceType && (
                      <span className="text-xs text-gray-600">{msg.deviceType}</span>
                    )}
                    {msg.regionCountry && (
                      <span className="text-xs text-gray-600">{msg.regionCountry}</span>
                    )}
                    <span className="text-xs text-gray-700 ml-auto">
                      {new Date(msg.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {/* Body */}
                  <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap break-words mb-4 bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                    {msg.body}
                  </p>

                  {/* Fingerprint info */}
                  <div className="text-xs text-gray-700 font-mono space-y-0.5">
                    <div>msg: {msg.id}</div>
                    {msg.fingerprintHash && <div>fp: {msg.fingerprintHash.slice(0, 20)}…</div>}
                    {msg.ipHash && <div>ip: {msg.ipHash.slice(0, 20)}…</div>}
                  </div>
                </div>

                {/* Actions */}
                <ActionButtons
                  messageId={msg.id}
                  hasFingerprintHash={!!msg.fingerprintHash}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { desc, eq } from 'drizzle-orm';
import { getPrimaryClient } from '@anon-inbox/db';
import { messages, messageMetadata, users } from '@anon-inbox/db';
import { decrypt } from '@/lib/encryption';

export const dynamic = 'force-dynamic';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-900/40 text-yellow-400 border-yellow-800/50',
  approved: 'bg-green-900/40 text-green-400 border-green-800/50',
  flagged: 'bg-red-900/40 text-red-400 border-red-800/50',
  blocked: 'bg-gray-800/60 text-gray-500 border-gray-700/50',
  shadow_blocked: 'bg-gray-800/60 text-gray-600 border-gray-700/50',
};

async function getAllMessages() {
  const db = getPrimaryClient();

  const rows = await db
    .select({
      id: messages.id,
      body: messages.body,
      status: messages.status,
      isRead: messages.isRead,
      createdAt: messages.createdAt,
      slug: users.slug,
      displayName: users.displayName,
      regionCountry: messageMetadata.regionCountry,
      deviceType: messageMetadata.deviceType,
    })
    .from(messages)
    .leftJoin(users, eq(users.id, messages.inboxOwnerId))
    .leftJoin(messageMetadata, eq(messageMetadata.messageId, messages.id))
    .orderBy(desc(messages.createdAt))
    .limit(200);

  return rows.map((m) => {
    let body = m.body;
    try {
      body = decrypt(m.body);
    } catch {
      body = '[decryption failed]';
    }
    return { ...m, body };
  });
}

export default async function AllMessagesPage() {
  if (!process.env['DATABASE_URL']) {
    return (
      <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl p-8 text-center">
        <p className="text-yellow-300 font-semibold">DATABASE_URL not configured.</p>
      </div>
    );
  }

  let rows: Awaited<ReturnType<typeof getAllMessages>> = [];

  try {
    rows = await getAllMessages();
  } catch (err) {
    return (
      <div className="bg-red-900/30 border border-red-700 rounded-xl p-8 text-center">
        <p className="text-red-300 font-semibold">Database error</p>
        <p className="text-red-500 font-mono text-sm mt-2">{String(err)}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 mb-1">All Messages</h1>
          <p className="text-sm text-gray-500">
            Latest 200 messages across all inboxes, newest first.
          </p>
        </div>
        <span className="text-sm text-gray-600">{rows.length} messages</span>
      </div>

      {rows.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">📭</div>
          <div className="text-lg font-semibold text-gray-300 mb-1">No messages yet</div>
          <div className="text-sm text-gray-600">
            Messages will appear here once people start sending them.
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((msg) => (
            <div
              key={msg.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-start gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span
                    className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLES[msg.status] ?? 'bg-gray-800 text-gray-400 border-gray-700'}`}
                  >
                    {msg.status}
                  </span>
                  <span className="text-xs text-gray-500">
                    to{' '}
                    <span className="text-purple-400 font-medium">
                      {msg.displayName ?? msg.slug ?? 'unknown'}
                    </span>
                    {msg.slug && (
                      <span className="text-gray-600 ml-1">/{msg.slug}</span>
                    )}
                  </span>
                  {msg.deviceType && (
                    <span className="text-xs text-gray-600">{msg.deviceType}</span>
                  )}
                  {msg.regionCountry && (
                    <span className="text-xs text-gray-600">{msg.regionCountry}</span>
                  )}
                  {!msg.isRead && (
                    <span className="text-xs text-blue-400 font-medium">unread</span>
                  )}
                  <span className="text-xs text-gray-700 ml-auto whitespace-nowrap">
                    {new Date(msg.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap break-words bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                  {msg.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

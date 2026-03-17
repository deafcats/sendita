import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Anon Inbox Admin',
  robots: 'noindex, nofollow',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 min-h-screen antialiased">
        <nav className="border-b border-gray-800 bg-gray-900">
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <span className="font-bold text-purple-400 text-lg">⚡ Admin</span>
              <a href="/" className="text-sm text-gray-400 hover:text-gray-100 transition-colors">
                Flagged
              </a>
              <a href="/messages" className="text-sm text-gray-400 hover:text-gray-100 transition-colors">
                All Messages
              </a>
              <a href="/csam" className="text-sm text-gray-400 hover:text-gray-100 transition-colors">
                CSAM Queue
              </a>
            </div>
            <span className="text-xs text-gray-600">IP-restricted access</span>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}

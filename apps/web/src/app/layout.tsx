import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Anonymous Inbox',
  description: 'Send anonymous messages to anyone',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

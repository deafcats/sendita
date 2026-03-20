import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sendita',
  description: 'A web-first streamer question inbox',
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

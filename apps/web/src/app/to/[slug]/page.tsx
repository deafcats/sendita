import type { Metadata } from 'next';
import { SubmissionPage } from '@/components/SubmissionPage';

interface Props {
  params: Promise<{ slug: string }>;
}

const API_URL =
  process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

async function getOwnerProfile(slug: string) {
  try {
    const res = await fetch(`${API_URL}/api/links/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json() as Promise<{
      displayName: string | null;
      avatarUrl: string | null;
      slug: string;
    }>;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getOwnerProfile(slug);

  if (!profile) {
    return {
      title: 'Anonymous Inbox',
      description: 'Send anonymous messages',
    };
  }

  const name = profile.displayName ?? 'Someone';
  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? '';

  return {
    title: `${name}'s anonymous inbox`,
    description: `Send ${name} an anonymous message`,
    openGraph: {
      title: `${name}'s anonymous inbox`,
      description: `Send ${name} an anonymous message — they'll never know it's you`,
      images: [
        {
          url: `${appUrl}/api/og?slug=${slug}`,
          width: 1200,
          height: 630,
          alt: `${name}'s anonymous inbox`,
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${name}'s anonymous inbox`,
      description: `Send ${name} an anonymous message`,
      images: [`${appUrl}/api/og?slug=${slug}`],
    },
  };
}

export default async function InboxPage({ params }: Props) {
  const { slug } = await params;
  const profile = await getOwnerProfile(slug);

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Inbox not found
          </h1>
          <p className="text-gray-500">This link may be invalid or inactive.</p>
        </div>
      </div>
    );
  }

  return <SubmissionPage profile={profile} />;
}

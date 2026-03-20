import type { Metadata } from 'next';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

export interface PublicProfile {
  displayName: string | null;
  avatarUrl: string | null;
  slug: string;
}

export async function getOwnerProfile(slug: string): Promise<PublicProfile | null> {
  try {
    const res = await fetch(`${API_URL}/api/links/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json() as Promise<PublicProfile>;
  } catch {
    return null;
  }
}

export async function buildInboxMetadata(slug: string): Promise<Metadata> {
  const profile = await getOwnerProfile(slug);

  if (!profile) {
    return {
      title: 'Question inbox',
      description: 'Send a question',
    };
  }

  const name = profile.displayName ?? 'Someone';
  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? '';

  return {
    title: `${name}'s question inbox`,
    description: `Send ${name} a question`,
    openGraph: {
      title: `${name}'s question inbox`,
      description: `Send ${name} a question from mobile or desktop`,
      images: [
        {
          url: `${appUrl}/api/og?slug=${slug}`,
          width: 1200,
          height: 630,
          alt: `${name}'s question inbox`,
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${name}'s question inbox`,
      description: `Send ${name} a question`,
      images: [`${appUrl}/api/og?slug=${slug}`],
    },
  };
}

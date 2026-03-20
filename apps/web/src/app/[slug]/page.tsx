import type { Metadata } from 'next';
import { PublicInboxPage } from '@/components/PublicInboxPage';
import { buildInboxMetadata } from '@/lib/public-profile';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return buildInboxMetadata(slug);
}

export default async function InboxPage({ params }: Props) {
  const { slug } = await params;
  return PublicInboxPage({ slug });
}

import { SubmissionPage } from '@/components/SubmissionPage';
import { getOwnerProfile } from '@/lib/public-profile';

export async function PublicInboxPage({ slug }: { slug: string }) {
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

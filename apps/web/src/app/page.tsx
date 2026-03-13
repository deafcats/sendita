import { SubmissionPage } from '@/components/SubmissionPage';

export default function PreviewPage() {
  const mockProfile = {
    displayName: 'Alex',
    avatarUrl: null,
    slug: 'alex',
  };

  return <SubmissionPage profile={mockProfile} />;
}

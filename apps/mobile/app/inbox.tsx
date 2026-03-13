import { router } from 'expo-router';
import { InboxDashboardScreen } from '../src/screens/InboxDashboardScreen';
import { setSelectedMessage } from '../src/lib/store';
import type { Message } from '@anon-inbox/shared';

export default function InboxRoute() {
  const handleMessagePress = (message: Message) => {
    setSelectedMessage(message);
    router.push('/message');
  };

  const handleSharePress = () => {
    router.push('/share');
  };

  const handleSettingsPress = () => {
    router.push('/safety');
  };

  return (
    <InboxDashboardScreen
      onMessagePress={handleMessagePress}
      onSharePress={handleSharePress}
      onSettingsPress={handleSettingsPress}
    />
  );
}

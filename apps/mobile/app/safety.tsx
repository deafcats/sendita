import { router } from 'expo-router';
import { SafetyToolsScreen } from '../src/screens/SafetyToolsScreen';

export default function SafetyRoute() {
  const handleLogout = () => {
    router.replace('/age-gate');
  };

  return (
    <SafetyToolsScreen
      onBack={() => router.back()}
      onLogout={handleLogout}
    />
  );
}

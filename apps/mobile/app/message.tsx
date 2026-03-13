import { router } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { MessageViewerScreen } from '../src/screens/MessageViewerScreen';
import { getSelectedMessage } from '../src/lib/store';

export default function MessageRoute() {
  const message = getSelectedMessage();

  if (!message) {
    router.back();
    return null;
  }

  const handlePaymentRequired = () => {
    // TODO: navigate to paywall / billing screen
    router.back();
  };

  return (
    <MessageViewerScreen
      message={message}
      onBack={() => router.back()}
      onPaymentRequired={handlePaymentRequired}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 16, color: '#374151' },
});

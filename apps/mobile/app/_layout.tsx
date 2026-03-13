import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="age-gate" />
        <Stack.Screen name="inbox" />
        <Stack.Screen name="message" options={{ presentation: 'card' }} />
        <Stack.Screen name="share" options={{ presentation: 'modal' }} />
        <Stack.Screen name="safety" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}

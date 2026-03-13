import { useState } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { AgeGateScreen } from '../src/screens/AgeGateScreen';
import {
  generateDeviceSecret,
  storeDeviceSecret,
  storeTokens,
  storeUserInfo,
} from '../src/lib/auth';

const API_URL = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3001';

export default function AgeGateRoute() {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async (birthYear: number) => {
    if (loading) return;
    setLoading(true);
    try {
      const deviceSecret = generateDeviceSecret();
      await storeDeviceSecret(deviceSecret);

      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceSecret, birthYear }),
      });

      if (!res.ok) {
        const err = await res.json() as { error?: string };
        Alert.alert('Registration failed', err.error ?? 'Something went wrong');
        return;
      }

      const data = await res.json() as {
        accessToken: string;
        refreshToken: string;
        userId: string;
        slug: string;
      };

      await storeTokens(data.accessToken, data.refreshToken);
      await storeUserInfo(data.userId, data.slug);
      router.replace('/inbox');
    } catch {
      Alert.alert('Error', 'Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return <AgeGateScreen onConfirm={handleConfirm} />;
}

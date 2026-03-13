import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { ShareLinkScreen } from '../src/screens/ShareLinkScreen';
import { getUserInfo } from '../src/lib/auth';

export default function ShareRoute() {
  const [userInfo, setUserInfo] = useState<{ userId: string; slug: string } | null>(null);

  useEffect(() => {
    getUserInfo().then(setUserInfo);
  }, []);

  if (!userInfo) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#9333ea" />
      </View>
    );
  }

  return (
    <ShareLinkScreen
      slug={userInfo.slug}
      displayName={null}
      onBack={() => router.back()}
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

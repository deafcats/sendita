import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { getUserInfo } from '../src/lib/auth';

export default function IndexScreen() {
  useEffect(() => {
    getUserInfo().then((info) => {
      if (info) {
        router.replace('/inbox');
      } else {
        router.replace('/age-gate');
      }
    });
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#9333ea" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
});

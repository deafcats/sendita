import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Share,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

interface Props {
  slug: string;
  displayName: string | null;
  onBack: () => void;
}

const APP_URL = process.env['EXPO_PUBLIC_APP_URL'] ?? 'https://askme.app';

export function ShareLinkScreen({ slug, displayName, onBack }: Props) {
  const shareUrl = `${APP_URL}/to/${slug}`;
  const name = displayName ?? 'your inbox';

  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(shareUrl);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Copied!', 'Your link has been copied to clipboard.');
  }, [shareUrl]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `Send me an anonymous message! 👇\n${shareUrl}`,
        url: shareUrl,
        title: `${name}'s anonymous inbox`,
      });
    } catch {
      Alert.alert('Error', 'Failed to open share sheet');
    }
  }, [shareUrl, name]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Share your inbox</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.content}>
        {/* Share card preview */}
        <View style={styles.shareCard}>
          <View style={styles.shareCardInner}>
            <View style={styles.shareAvatar}>
              <Text style={styles.shareAvatarText}>
                {(displayName ?? '?').charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.shareCardName}>
              {displayName ?? 'Anonymous'}
            </Text>
            <Text style={styles.shareCardSubtitle}>
              Send me an anonymous message
            </Text>
            <View style={styles.shareCardUrl}>
              <Text style={styles.shareCardUrlText} numberOfLines={1}>
                {shareUrl}
              </Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <TouchableOpacity style={styles.primaryButton} onPress={handleShare}>
          <Text style={styles.primaryButtonText}>Share link</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={handleCopy}>
          <Text style={styles.secondaryButtonText}>Copy link</Text>
        </TouchableOpacity>

        <Text style={styles.tip}>
          💡 Share on Instagram Stories, TikTok, or wherever your friends are
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backButton: { padding: 4 },
  backButtonText: { color: '#9333ea', fontWeight: '600', fontSize: 15 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111' },
  content: { flex: 1, padding: 24, gap: 16, alignItems: 'center' },
  shareCard: {
    width: '100%',
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#9333ea',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
    marginBottom: 8,
  },
  shareCardInner: {
    backgroundColor: '#9333ea',
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  shareAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  shareAvatarText: { fontSize: 32, color: '#fff', fontWeight: '700' },
  shareCardName: { fontSize: 22, fontWeight: '800', color: '#fff' },
  shareCardSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  shareCardUrl: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 8,
    maxWidth: '100%',
  },
  shareCardUrlText: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '500' },
  primaryButton: {
    width: '100%',
    backgroundColor: '#9333ea',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryButton: {
    width: '100%',
    backgroundColor: '#f3e8ff',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: { color: '#9333ea', fontWeight: '700', fontSize: 16 },
  tip: { fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 20, paddingHorizontal: 8 },
});

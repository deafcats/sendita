import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { fetchInboxMessages } from '../lib/api';
import type { Message } from '@anon-inbox/shared';

interface Props {
  onMessagePress: (message: Message) => void;
  onSharePress: () => void;
  onSettingsPress: () => void;
}

export function InboxDashboardScreen({
  onMessagePress,
  onSharePress,
  onSettingsPress,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadMessages = useCallback(async (cursor?: string) => {
    try {
      const data = await fetchInboxMessages(cursor);
      if (cursor) {
        setMessages((prev) => [...prev, ...data.items]);
      } else {
        setMessages(data.items);
      }
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      Alert.alert('Error', 'Failed to load messages');
    }
  }, []);

  useEffect(() => {
    loadMessages().finally(() => setLoading(false));
  }, [loadMessages]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMessages();
    setRefreshing(false);
  }, [loadMessages]);

  const handleLoadMore = useCallback(async () => {
    if (!hasMore || loadingMore || !nextCursor) return;
    setLoadingMore(true);
    await loadMessages(nextCursor);
    setLoadingMore(false);
  }, [hasMore, loadingMore, nextCursor, loadMessages]);

  const unreadCount = messages.filter((m) => !m.isRead).length;

  const renderMessage = ({ item }: { item: Message }) => {
    const preview =
      item.body.length > 80 ? `${item.body.slice(0, 80)}...` : item.body;
    const timeAgo = formatTimeAgo(item.createdAt);

    return (
      <TouchableOpacity
        style={[styles.messageCard, !item.isRead && styles.messageCardUnread]}
        onPress={() => onMessagePress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.messageHeader}>
          <View style={styles.anonymousAvatar}>
            <Text style={styles.anonymousAvatarText}>?</Text>
          </View>
          <View style={styles.messageHeaderText}>
            <Text style={styles.senderLabel}>Anonymous</Text>
            <Text style={styles.timeLabel}>{timeAgo}</Text>
          </View>
          {!item.isRead && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.messagePreview} numberOfLines={2}>
          {preview}
        </Text>
        <View style={styles.hintTeaser}>
          <Text style={styles.hintTeaserText}>🔒 Unlock hint</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#9333ea" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Inbox</Text>
          {unreadCount > 0 && (
            <Text style={styles.unreadBadge}>{unreadCount} new</Text>
          )}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={onSharePress} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onSettingsPress} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {messages.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📬</Text>
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptySubtitle}>
            Share your link to start receiving anonymous messages
          </Text>
          <TouchableOpacity style={styles.shareButton} onPress={onSharePress}>
            <Text style={styles.shareButtonText}>Share my link</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#9333ea"
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                size="small"
                color="#9333ea"
                style={styles.loadMoreSpinner}
              />
            ) : null
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function formatTimeAgo(date: Date): string {
  const d = date instanceof Date ? date : new Date(date);
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#111' },
  unreadBadge: { fontSize: 12, color: '#9333ea', fontWeight: '600', marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#f3e8ff',
    borderRadius: 20,
  },
  headerButtonText: { color: '#9333ea', fontWeight: '600', fontSize: 13 },
  listContent: { padding: 16, gap: 12 },
  messageCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  messageCardUnread: {
    borderLeftWidth: 3,
    borderLeftColor: '#9333ea',
  },
  messageHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  anonymousAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3e8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  anonymousAvatarText: { fontSize: 16, color: '#9333ea' },
  messageHeaderText: { flex: 1 },
  senderLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  timeLabel: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9333ea',
  },
  messagePreview: { fontSize: 15, color: '#374151', lineHeight: 22, marginBottom: 10 },
  hintTeaser: {
    alignSelf: 'flex-start',
    backgroundColor: '#fdf4ff',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  hintTeaserText: { fontSize: 12, color: '#9333ea', fontWeight: '600' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyEmoji: { fontSize: 60, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#111', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  shareButton: {
    backgroundColor: '#9333ea',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  shareButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  loadMoreSpinner: { paddingVertical: 16 },
});

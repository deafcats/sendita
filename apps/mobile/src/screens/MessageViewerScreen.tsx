import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import type { Message } from '@anon-inbox/shared';
import { unlockHint, reportMessage, formatHint } from '../lib/api';

interface Props {
  message: Message;
  onBack: () => void;
  onPaymentRequired: () => void;
}

const REPORT_REASONS = [
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'hate', label: 'Hate speech' },
  { value: 'self_harm', label: 'Self-harm or suicide' },
  { value: 'spam', label: 'Spam' },
  { value: 'csam', label: 'Child exploitation' },
  { value: 'other', label: 'Other' },
];

export function MessageViewerScreen({ message, onBack, onPaymentRequired }: Props) {
  const [hints, setHints] = useState<Record<string, string | boolean> | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reporting, setReporting] = useState(false);

  const handleUnlockHint = async () => {
    setHintLoading(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const result = await unlockHint(message.id);
      setHints(result.hints);
    } catch (err) {
      if (err instanceof Error && err.message === 'PAYMENT_REQUIRED') {
        onPaymentRequired();
      } else {
        Alert.alert('Error', 'Failed to unlock hint. Please try again.');
      }
    } finally {
      setHintLoading(false);
    }
  };

  const handleReport = async (reason: string) => {
    setReporting(true);
    try {
      await reportMessage(message.id, reason);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setReportModalVisible(false);
      Alert.alert('Reported', 'Thank you. We\'ll review this message.');
      onBack();
    } catch {
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setReporting(false);
    }
  };

  const messageDate = new Date(message.createdAt);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setReportModalVisible(true)}
          style={styles.reportButton}
        >
          <Text style={styles.reportButtonText}>Report</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Anonymous sender */}
        <View style={styles.senderRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>?</Text>
          </View>
          <View>
            <Text style={styles.senderName}>Anonymous</Text>
            <Text style={styles.timestamp}>
              {messageDate.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>

        {/* Message body */}
        <View style={styles.messageCard}>
          <Text style={styles.messageBody}>{message.body}</Text>
        </View>

        {/* Hint section */}
        <View style={styles.hintSection}>
          <Text style={styles.hintSectionTitle}>Sender hints</Text>
          <Text style={styles.hintDisclaimer}>
            Hints are approximate and based on available signals — they are not guaranteed to be accurate.
          </Text>

          {hints ? (
            <View style={styles.hintsRevealed}>
              {Object.entries(hints).map(([key, value]) => (
                <View key={key} style={styles.hintItem}>
                  <Text style={styles.hintIcon}>
                    {key === 'device' ? '📱' : key === 'region' ? '📍' : key === 'fastSend' ? '⚡' : '🔄'}
                  </Text>
                  <Text style={styles.hintText}>{formatHint(key, value)}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.hintLocked}>
              {/* Blurred hint previews */}
              {['Device type', 'Location hint', 'Timing'].map((label) => (
                <View key={label} style={styles.hintItemBlurred}>
                  <View style={styles.blurredContent} />
                  <Text style={styles.hintLabelBlurred}>{label}</Text>
                </View>
              ))}

              <TouchableOpacity
                style={styles.unlockButton}
                onPress={handleUnlockHint}
                disabled={hintLoading}
              >
                {hintLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.unlockButtonIcon}>🔓</Text>
                    <Text style={styles.unlockButtonText}>Unlock hint (1 credit)</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Report Modal */}
      <Modal
        visible={reportModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Report message</Text>
            <Text style={styles.modalSubtitle}>Why are you reporting this?</Text>

            {REPORT_REASONS.map((r) => (
              <TouchableOpacity
                key={r.value}
                style={styles.reportOption}
                onPress={() => handleReport(r.value)}
                disabled={reporting}
              >
                <Text style={styles.reportOptionText}>{r.label}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setReportModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backButton: { padding: 4 },
  backButtonText: { color: '#9333ea', fontWeight: '600', fontSize: 15 },
  reportButton: {
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  reportButtonText: { color: '#dc2626', fontWeight: '600', fontSize: 13 },
  content: { padding: 20, gap: 20 },
  senderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f3e8ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 20, color: '#9333ea' },
  senderName: { fontSize: 15, fontWeight: '700', color: '#111' },
  timestamp: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  messageCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  messageBody: { fontSize: 18, color: '#111', lineHeight: 28 },
  hintSection: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  hintSectionTitle: { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 6 },
  hintDisclaimer: { fontSize: 11, color: '#9ca3af', lineHeight: 16, marginBottom: 16 },
  hintsRevealed: { gap: 12 },
  hintItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hintIcon: { fontSize: 20 },
  hintText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  hintLocked: { gap: 12 },
  hintItemBlurred: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  blurredContent: {
    width: 180,
    height: 14,
    backgroundColor: '#e5e7eb',
    borderRadius: 7,
    opacity: 0.6,
  },
  hintLabelBlurred: { fontSize: 13, color: '#d1d5db' },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#9333ea',
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 8,
  },
  unlockButtonIcon: { fontSize: 18 },
  unlockButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    gap: 12,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#111' },
  modalSubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 4 },
  reportOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  reportOptionText: { fontSize: 15, color: '#374151' },
  cancelButton: { paddingVertical: 14, alignItems: 'center' },
  cancelButtonText: { fontSize: 15, color: '#9333ea', fontWeight: '600' },
});

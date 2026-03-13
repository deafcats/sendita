import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  ScrollView,
} from 'react-native';
import { deleteAccount } from '../lib/api';
import { clearAuth } from '../lib/auth';

interface Props {
  onBack: () => void;
  onLogout: () => void;
}

export function SafetyToolsScreen({ onBack, onLogout }: Props) {
  const [inboxPaused, setInboxPaused] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This will permanently delete your account and all messages within 30 days. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteAccount();
              await clearAuth();
              onLogout();
            } catch {
              Alert.alert('Error', 'Failed to delete account. Please try again.');
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Safety & Settings</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Inbox controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Inbox</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Pause inbox</Text>
              <Text style={styles.settingDescription}>
                Stop receiving new messages temporarily
              </Text>
            </View>
            <Switch
              value={inboxPaused}
              onValueChange={setInboxPaused}
              trackColor={{ false: '#e5e7eb', true: '#9333ea' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>🔒</Text>
            <Text style={styles.infoText}>
              All sender IPs are hashed and irreversible. We never store
              identifiable sender information. Your inbox is protected.
            </Text>
          </View>
        </View>

        {/* Automated prompts disclosure */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About your inbox</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>💬</Text>
            <Text style={styles.infoText}>
              Your inbox may occasionally receive suggested conversation starters
              to help get things going. These appear when your inbox has been
              quiet.
            </Text>
          </View>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={handleDeleteAccount}
            disabled={deleting}
          >
            <Text style={styles.dangerButtonText}>
              {deleting ? 'Deleting...' : 'Delete account'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.dangerNote}>
            All your messages and data will be permanently deleted within 30
            days, in accordance with GDPR/CCPA.
          </Text>
        </View>

        {/* Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>
          <TouchableOpacity style={styles.linkRow}>
            <Text style={styles.linkText}>Privacy Policy →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkRow}>
            <Text style={styles.linkText}>Terms of Service →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  content: { padding: 20, gap: 8 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 15, fontWeight: '600', color: '#111' },
  settingDescription: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#f3e8ff',
    borderRadius: 16,
    padding: 16,
  },
  infoIcon: { fontSize: 20, marginTop: 2 },
  infoText: { flex: 1, fontSize: 14, color: '#4b5563', lineHeight: 20 },
  dangerButton: {
    backgroundColor: '#fee2e2',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  dangerButtonText: { color: '#dc2626', fontWeight: '700', fontSize: 15 },
  dangerNote: { fontSize: 12, color: '#9ca3af', lineHeight: 18 },
  linkRow: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  linkText: { fontSize: 15, color: '#9333ea', fontWeight: '500' },
});

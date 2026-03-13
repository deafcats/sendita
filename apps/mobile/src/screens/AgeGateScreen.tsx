import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { COPPA_MIN_AGE } from '@anon-inbox/shared';

interface Props {
  onConfirm: (birthYear: number) => void;
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

export function AgeGateScreen({ onConfirm }: Props) {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const handleConfirm = () => {
    if (!selectedYear) {
      Alert.alert('Please select your birth year');
      return;
    }
    const age = currentYear - selectedYear;
    if (age < COPPA_MIN_AGE) {
      Alert.alert(
        'Age requirement',
        `You must be at least ${COPPA_MIN_AGE} years old to use this app.`,
      );
      return;
    }
    onConfirm(selectedYear);
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.emoji}>🔒</Text>
        <Text style={styles.title}>Age verification</Text>
        <Text style={styles.subtitle}>
          Please confirm you are {COPPA_MIN_AGE} or older to continue
        </Text>

        <Text style={styles.label}>Select your birth year</Text>
        <View style={styles.pickerContainer}>
          <ScrollView
            style={styles.picker}
            showsVerticalScrollIndicator={true}
          >
            {years.map((year) => (
              <TouchableOpacity
                key={year}
                style={[
                  styles.yearItem,
                  selectedYear === year && styles.yearItemSelected,
                ]}
                onPress={() => setSelectedYear(year)}
              >
                <Text
                  style={[
                    styles.yearText,
                    selectedYear === year && styles.yearTextSelected,
                  ]}
                >
                  {year}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <TouchableOpacity
          style={[styles.button, !selectedYear && styles.buttonDisabled]}
          onPress={handleConfirm}
          disabled={!selectedYear}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  emoji: { fontSize: 40, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#111', marginBottom: 8 },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  label: { fontSize: 13, color: '#374151', fontWeight: '600', marginBottom: 8, alignSelf: 'flex-start' },
  pickerContainer: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    marginBottom: 20,
  },
  picker: { flex: 1 },
  yearItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  yearItemSelected: { backgroundColor: '#f3e8ff' },
  yearText: { fontSize: 16, color: '#374151', textAlign: 'center' },
  yearTextSelected: { color: '#9333ea', fontWeight: '700' },
  button: {
    width: '100%',
    backgroundColor: '#9333ea',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  disclaimer: { fontSize: 11, color: '#9ca3af', textAlign: 'center', lineHeight: 16 },
});

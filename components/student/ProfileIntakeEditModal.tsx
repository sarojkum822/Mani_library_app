import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { api } from '@/lib/api';
import { sanitizeAadhaarLastFourInput, sanitizeRollNumberDigitsInput } from '@/lib/intakeFieldLimits';
import { MEMBERSHIP_INSTITUTION_OPTIONS, MEMBERSHIP_INSTITUTION_VALUES } from '@/lib/membershipInstitutionOptions';

export type ProfileIntakeEditSection = 'identity' | 'study';

type Initial = {
  aadhaarLastFour: string;
  studentRollNumber: string;
  institutionType: string;
  preparingFor: string;
};

type Props = {
  visible: boolean;
  section: ProfileIntakeEditSection;
  initial: Initial;
  token: string;
  onClose: () => void;
  onSaved: () => void;
};

export function ProfileIntakeEditModal({
  visible,
  section,
  initial,
  token,
  onClose,
  onSaved,
}: Props) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();

  const [last4, setLast4] = useState('');
  const [roll, setRoll] = useState('');
  const [institution, setInstitution] = useState('');
  const [preparing, setPreparing] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLast4(initial.aadhaarLastFour);
    setRoll(initial.studentRollNumber);
    setInstitution(initial.institutionType);
    setPreparing(initial.preparingFor);
  }, [visible, initial]);

  const title = section === 'identity' ? 'Edit identity' : 'Edit study details';

  async function onSave() {
    if (section === 'identity') {
      if (!/^\d{4}$/.test(last4)) {
        Alert.alert('Aadhaar', 'Enter exactly 4 digits (last digits of your Aadhaar only).');
        return;
      }
      setSaving(true);
      try {
        await api.updateProfileIntake(token, {
          aadhaar_last_four: last4,
          student_roll_number: initial.studentRollNumber || null,
          institution_type: initial.institutionType || null,
          preparing_for: initial.preparingFor.trim() || null,
        });
        onSaved();
        onClose();
      } catch (e: unknown) {
        Alert.alert('Could not save', e instanceof Error ? e.message : 'Try again.');
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!MEMBERSHIP_INSTITUTION_VALUES.has(institution)) {
      Alert.alert('Institution', 'Choose school, college, freelance, or other.');
      return;
    }
    setSaving(true);
    try {
      await api.updateProfileIntake(token, {
        aadhaar_last_four: initial.aadhaarLastFour || null,
        student_roll_number: sanitizeRollNumberDigitsInput(roll) || null,
        institution_type: institution,
        preparing_for: preparing.trim() || null,
      });
      onSaved();
      onClose();
    } catch (e: unknown) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.safe, { backgroundColor: c.surface }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.toolbar, { paddingTop: insets.top + 8, borderBottomColor: c.border }]}>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
            <Text style={[styles.cancel, { color: c.azure600 }]}>Cancel</Text>
          </Pressable>
          <Text style={[styles.toolbarTitle, { color: c.ink900 }]}>{title}</Text>
          <View style={{ width: 56 }} />
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.body, { paddingBottom: Math.max(insets.bottom, 20) + 24 }]}
        >
          {section === 'identity' ? (
            <>
              <Text style={[styles.hint, { color: c.ink600 }]}>
                Only the last 4 digits of Aadhaar are stored — never the full number.
              </Text>
              <TextField
                label="Aadhaar — last 4 digits"
                value={last4}
                onChangeText={(t) => setLast4(sanitizeAadhaarLastFourInput(t))}
                placeholder="e.g. 1234"
                keyboardType="number-pad"
                maxLength={4}
              />
            </>
          ) : (
            <>
              <TextField
                label="Roll / reg. no."
                value={roll}
                onChangeText={(t) => setRoll(sanitizeRollNumberDigitsInput(t))}
                placeholder="Optional"
                keyboardType="number-pad"
                maxLength={8}
              />
              <View style={{ gap: 8 }}>
                <Text style={[styles.fieldLabel, { color: c.ink700 }]}>Institution</Text>
                <View style={styles.chipRow}>
                  {MEMBERSHIP_INSTITUTION_OPTIONS.map((opt) => {
                    const selected = institution === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => setInstitution(opt.value)}
                        style={[
                          styles.chip,
                          {
                            borderColor: selected ? c.azure500 : c.border,
                            backgroundColor: selected ? c.azure50 : c.surface,
                          },
                        ]}
                      >
                        <Text style={{ color: selected ? c.ink900 : c.ink600, fontSize: 13, fontWeight: '600' }}>
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <TextField
                label="Preparing for"
                value={preparing}
                onChangeText={setPreparing}
                placeholder="e.g. UPSC, Bihar Board 12th"
              />
            </>
          )}
          <Button title={saving ? 'Saving…' : 'Save details'} loading={saving} onPress={() => void onSave()} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cancel: { fontSize: 16, fontWeight: '500' },
  toolbarTitle: { fontSize: 17, fontWeight: '600' },
  body: { padding: 16, gap: 16 },
  hint: { fontSize: 13, lineHeight: 19, fontWeight: '400' },
  fieldLabel: { fontSize: 13, fontWeight: '600' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
});

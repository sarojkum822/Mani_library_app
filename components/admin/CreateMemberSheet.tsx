import * as Clipboard from 'expo-clipboard';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AdminSeatPickerPanel } from '@/components/admin/AdminSeatPickerModal';
import { Button } from '@/components/ui/Button';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { api, type AdminManualEnrollResult } from '@/lib/api';
import {
  MANUAL_PAYMENT_METHODS,
  defaultDurationKey,
  durationOptionsForPlan,
  type ManualPlanKind,
} from '@/lib/adminPricing';
import { todayIsoYmd } from '@/lib/adminDates';
import { formatPersonName } from '@/lib/formatPersonName';
import { computeOrderAmountRupees } from '@/lib/membershipPricing';

type Props = {
  visible: boolean;
  token: string;
  onClose: () => void;
  onSuccess: (result: AdminManualEnrollResult) => void;
};

export function CreateMemberSheet({ visible, token, onClose, onSuccess }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  const [createdResult, setCreatedResult] = useState<AdminManualEnrollResult | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const [planKind, setPlanKind] = useState<ManualPlanKind>('long_term');
  const [durationKey, setDurationKey] = useState(defaultDurationKey('long_term'));
  const [seat, setSeat] = useState('');
  const [startDate, setStartDate] = useState(todayIsoYmd());
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<(typeof MANUAL_PAYMENT_METHODS)[number]['key']>('cash');
  const [externalRef, setExternalRef] = useState('');
  const [staffNote, setStaffNote] = useState('');
  const [markKyc, setMarkKyc] = useState(false);
  const [seatPickerOpen, setSeatPickerOpen] = useState(false);
  const [amountTouched, setAmountTouched] = useState(false);
  const [busy, setBusy] = useState(false);

  const durationOpts = durationOptionsForPlan(planKind);
  const catalogAmount = useMemo(() => computeOrderAmountRupees(planKind, durationKey), [planKind, durationKey]);

  useEffect(() => {
    if (!visible) {
      setAmountTouched(false);
      setCreatedResult(null);
    }
  }, [visible]);

  useEffect(() => {
    if (amountTouched || catalogAmount == null) return;
    setAmount(String(catalogAmount));
  }, [catalogAmount, planKind, durationKey, amountTouched]);

  const applyCatalogAmount = useCallback(() => {
    if (catalogAmount != null) {
      setAmount(String(catalogAmount));
      setAmountTouched(false);
    }
  }, [catalogAmount]);

  const selectedSeatNum = useMemo(() => {
    const n = parseInt(seat.trim(), 10);
    return Number.isFinite(n) && n >= 1 ? n : null;
  }, [seat]);

  const seatCodeLabel =
    selectedSeatNum != null
      ? planKind === 'long_term'
        ? `F${selectedSeatNum}`
        : `S${selectedSeatNum}`
      : null;

  const openSeatPicker = useCallback(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate.trim())) {
      Alert.alert('Start date required', 'Enter a valid start date (YYYY-MM-DD) before choosing a seat.');
      return;
    }
    setSeatPickerOpen(true);
  }, [startDate]);

  const resetForm = useCallback(() => {
    setFullName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setPlanKind('long_term');
    setDurationKey(defaultDurationKey('long_term'));
    setSeat('');
    setStartDate(todayIsoYmd());
    setAmount('');
    setMethod('cash');
    setExternalRef('');
    setStaffNote('');
    setMarkKyc(false);
    setCreatedResult(null);
  }, []);

  const handleClose = useCallback(() => {
    if (busy) return;
    resetForm();
    onClose();
  }, [busy, onClose, resetForm]);

  const finishSuccess = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  async function submit() {
    const seatN = parseInt(seat.trim(), 10);
    const amountN = parseInt(amount.trim(), 10);
    if (!Number.isFinite(seatN) || seatN < 1) {
      Alert.alert('Seat required', 'Tap “Select seat on map” and choose a free desk.');
      return;
    }
    if (!Number.isFinite(amountN) || amountN < 1) {
      Alert.alert('Invalid amount', 'Enter amount collected in whole rupees.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate.trim())) {
      Alert.alert('Invalid date', 'Start date must be YYYY-MM-DD.');
      return;
    }

    if (!fullName.trim() || !email.trim()) {
      Alert.alert('Account required', 'Full name and email are required for a new member login.');
      return;
    }

    setBusy(true);
    try {
      const body: Parameters<typeof api.adminManualEnroll>[1] = {
        plan_kind: planKind,
        seat_number: seatN,
        membership_start_date: startDate.trim(),
        duration_key: durationKey,
        amount_rupees: amountN,
        payment_method: method,
        external_reference: externalRef.trim() || undefined,
        staff_note: staffNote.trim() || undefined,
        mark_kyc_verified: markKyc,
      };

      body.full_name = formatPersonName(fullName);
      body.email = email.trim();
      body.phone = phone.trim() || undefined;
      body.password = password.trim() || undefined;

      const result = await api.adminManualEnroll(token, body);
      onSuccess(result);
      if (result.temporary_password) {
        await Clipboard.setStringAsync(result.temporary_password);
      }
      setCreatedResult(result);
    } catch (e: unknown) {
      Alert.alert('Could not create member', e instanceof Error ? e.message : 'Enrollment failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={[styles.root, { backgroundColor: c.surfaceMuted }]}>
        {seatPickerOpen ? (
          <AdminSeatPickerPanel
            token={token}
            planKind={planKind}
            startDate={startDate.trim()}
            durationKey={durationKey}
            selectedSeatId={selectedSeatNum}
            onSelect={(n) => setSeat(String(n))}
            onClose={() => setSeatPickerOpen(false)}
          />
        ) : createdResult ? (
          <>
            <View style={[styles.header, { borderBottomColor: c.border, backgroundColor: c.surface }]}>
              <Text style={[styles.title, { color: c.ink900 }]}>Member created</Text>
              <Text style={[styles.hint, { color: c.ink600 }]}>
                Membership and payment are recorded. Enroll this device user id on the terminal.
              </Text>
            </View>
            <ScrollView contentContainerStyle={styles.body}>
              <View style={[styles.deviceIdCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                <Text style={[styles.deviceIdLabel, { color: c.ink500 }]}>Device user id</Text>
                <Text style={[styles.deviceIdValue, { color: c.ink900 }]}>
                  {String(createdResult.device_user_id).padStart(4, '0')}
                </Text>
                <Text style={[styles.deviceIdHint, { color: c.ink500 }]}>
                  Device user id {String(createdResult.device_user_id).padStart(4, '0')} · use on the biometric terminal.
                </Text>
              </View>
              {createdResult.temporary_password ? (
                <View style={[styles.passwordCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                  <Text style={[styles.deviceIdLabel, { color: c.ink500 }]}>Temporary password</Text>
                  <Text style={[styles.passwordValue, { color: c.ink900 }]} selectable>
                    {createdResult.temporary_password}
                  </Text>
                  <Text style={[styles.deviceIdHint, { color: c.ink500 }]}>
                    Copied to clipboard — share securely with the member.
                  </Text>
                </View>
              ) : null}
              <Button title="Done" onPress={finishSuccess} />
            </ScrollView>
          </>
        ) : (
          <>
        <View style={[styles.header, { borderBottomColor: c.border, backgroundColor: c.surface }]}>
          <Text style={[styles.title, { color: c.ink900 }]}>Create member</Text>
          <Text style={[styles.hint, { color: c.ink600 }]}>
            Walk-in enrollment: new login, active seat, and manual payment — same as the staff website.
          </Text>
          <Pressable onPress={handleClose} accessibilityRole="button" style={styles.closeHit} disabled={busy}>
            <Text style={{ color: c.azure600, fontWeight: '600' }}>Close</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Field label="Full name" c={c}>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              onBlur={() => setFullName((v) => formatPersonName(v))}
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              style={[styles.input, { borderColor: c.border, color: c.ink900, backgroundColor: c.surface }]}
            />
          </Field>
          <Field label="Email (login)" c={c}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="off"
              textContentType="none"
              style={[styles.input, { borderColor: c.border, color: c.ink900, backgroundColor: c.surface }]}
            />
          </Field>
          <Field label="Phone (optional)" c={c}>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoComplete="off"
              textContentType="none"
              style={[styles.input, { borderColor: c.border, color: c.ink900, backgroundColor: c.surface }]}
            />
          </Field>
          <Field label="Password (optional)" c={c}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="off"
              textContentType="none"
              placeholder="Auto-generated if blank"
              placeholderTextColor={c.ink400}
              style={[styles.input, { borderColor: c.border, color: c.ink900, backgroundColor: c.surface }]}
            />
          </Field>
          <Text style={[styles.note, { color: c.ink500 }]}>
            Phone and password are for the member’s app login. Leave password blank to auto-generate one.
          </Text>

          <Text style={[styles.sectionHead, { color: c.ink900 }]}>Membership & payment</Text>

          <Field label="Plan" c={c}>
            <View style={styles.chips}>
              {(['long_term', 'short_term'] as const).map((pk) => (
                <Pressable
                  key={pk}
                  onPress={() => {
                    setPlanKind(pk);
                    setDurationKey(defaultDurationKey(pk));
                    setSeat('');
                    setAmountTouched(false);
                  }}
                  style={[
                    styles.chip,
                    {
                      borderColor: planKind === pk ? c.azure500 : c.border,
                      backgroundColor: planKind === pk ? c.azure500 : c.surface,
                    },
                  ]}
                >
                  <Text style={{ color: planKind === pk ? '#fff' : c.ink800, fontWeight: '600', fontSize: 13 }}>
                    {pk === 'long_term' ? 'Main hall' : 'Row hall'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Field>

          <Field label="Duration" c={c}>
            <View style={styles.chips}>
              {durationOpts.map((o) => (
                <Pressable
                  key={o.key}
                  onPress={() => {
                    setDurationKey(o.key);
                    setSeat('');
                    setAmountTouched(false);
                  }}
                  style={[
                    styles.chip,
                    {
                      borderColor: durationKey === o.key ? c.azure500 : c.border,
                      backgroundColor: durationKey === o.key ? c.azure50 : c.surface,
                    },
                  ]}
                >
                  <Text style={{ color: c.ink800, fontSize: 12, fontWeight: '600' }}>{o.label}</Text>
                </Pressable>
              ))}
            </View>
          </Field>

          <Field label="Start date" c={c}>
            <TextInput
              value={startDate}
              onChangeText={(v) => {
                setStartDate(v);
                setSeat('');
              }}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
              style={[styles.input, { borderColor: c.border, color: c.ink900, backgroundColor: c.surface }]}
            />
          </Field>

          <Field label="Seat" c={c}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Select seat on floor map"
              onPress={openSeatPicker}
              style={({ pressed }) => [
                styles.seatPickerBtn,
                { borderColor: c.border, backgroundColor: c.surface },
                pressed && { opacity: 0.9 },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.seatPickerTitle, { color: c.ink900 }]}>
                  {seatCodeLabel ? `${seatCodeLabel} · Seat ${selectedSeatNum}` : 'Select seat on map'}
                </Text>
                <Text style={[styles.seatPickerSub, { color: c.ink500 }]}>
                  See free vs occupied for your plan and start date
                </Text>
              </View>
              <Text style={{ color: c.azure600, fontWeight: '700', fontSize: 15 }}>Choose</Text>
            </Pressable>
          </Field>

          <View style={[styles.amountCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={styles.amountHead}>
              <Text style={[styles.amountLabel, { color: c.ink500 }]}>Amount (₹)</Text>
              {catalogAmount != null ? (
                <Pressable onPress={applyCatalogAmount} hitSlop={8}>
                  <Text style={[styles.catalogLink, { color: c.azure600 }]}>
                    Catalog ₹{catalogAmount.toLocaleString('en-IN')}
                  </Text>
                </Pressable>
              ) : null}
            </View>
            <TextInput
              value={amount}
              onChangeText={(v) => {
                setAmount(v);
                setAmountTouched(true);
              }}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={c.ink400}
              style={[styles.amountInput, { borderColor: c.border, color: c.ink900, backgroundColor: c.surfaceMuted }]}
            />
            <Text style={[styles.amountHint, { color: c.ink500 }]}>
              {catalogAmount != null
                ? 'Filled from plan price — edit for discounts or cash rounding.'
                : 'Enter amount collected in whole rupees.'}
            </Text>
          </View>

          <Field label="Payment method" c={c}>
            <View style={styles.chips}>
              {MANUAL_PAYMENT_METHODS.map((m) => (
                <Pressable
                  key={m.key}
                  onPress={() => setMethod(m.key)}
                  style={[
                    styles.chip,
                    {
                      borderColor: method === m.key ? c.azure500 : c.border,
                      backgroundColor: method === m.key ? c.azure50 : c.surface,
                    },
                  ]}
                >
                  <Text style={{ color: c.ink800, fontSize: 12, fontWeight: '600' }}>{m.label}</Text>
                </Pressable>
              ))}
            </View>
          </Field>

          <Field label="Payment reference (optional)" c={c}>
            <TextInput
              value={externalRef}
              onChangeText={setExternalRef}
              placeholder="UPI ref, receipt no., etc."
              placeholderTextColor={c.ink400}
              style={[styles.input, { borderColor: c.border, color: c.ink900, backgroundColor: c.surface }]}
            />
          </Field>

          <Field label="Staff note (optional)" c={c}>
            <TextInput
              value={staffNote}
              onChangeText={setStaffNote}
              multiline
              style={[
                styles.input,
                styles.multiline,
                { borderColor: c.border, color: c.ink900, backgroundColor: c.surface },
              ]}
            />
          </Field>

          <View style={[styles.toggleRow, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleTitle, { color: c.ink900 }]}>Mark KYC verified</Text>
              <Text style={[styles.toggleSub, { color: c.ink500 }]}>Skip document review for this member.</Text>
            </View>
            <Switch
              value={markKyc}
              onValueChange={setMarkKyc}
              disabled={busy}
              trackColor={{ false: c.ink200, true: c.azure200 }}
              thumbColor={markKyc ? c.azure500 : c.surface}
            />
          </View>

          <Button title={busy ? 'Creating…' : 'Create member'} disabled={busy} onPress={() => void submit()} />
        </ScrollView>
          </>
        )}
      </View>
    </Modal>
  );
}

function Field({
  label,
  c,
  children,
}: {
  label: string;
  c: (typeof Colors)['light'];
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: c.ink500 }]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingTop: Platform.OS === 'ios' ? 16 : 12,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  title: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  hint: { fontSize: 14, lineHeight: 20, fontWeight: '400', paddingRight: 56 },
  closeHit: { position: 'absolute', top: Platform.OS === 'ios' ? 16 : 12, right: 20 },
  body: { padding: 20, gap: 14, paddingBottom: 48 },
  sectionHead: { fontSize: 17, fontWeight: '600', marginTop: 4 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  toggleTitle: { fontSize: 15, fontWeight: '600' },
  toggleSub: { marginTop: 2, fontSize: 13, lineHeight: 18 },
  deviceIdCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  deviceIdLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  deviceIdValue: {
    fontSize: 32,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 1,
  },
  deviceIdHint: { marginTop: 4, fontSize: 13, lineHeight: 18, fontWeight: '400' },
  passwordCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  passwordValue: { fontSize: 17, fontWeight: '600', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  field: { gap: 8 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: 16,
    minHeight: 48,
  },
  mono: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 14 },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  note: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  seatPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 56,
  },
  seatPickerTitle: { fontSize: 16, fontWeight: '600' },
  seatPickerSub: { marginTop: 2, fontSize: 13, lineHeight: 18 },
  amountCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 10,
  },
  amountHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  amountLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  catalogLink: { fontSize: 14, fontWeight: '600' },
  amountInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 16 : 14,
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    minHeight: 56,
  },
  amountHint: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
});

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AdminAvatar } from '@/components/admin/AdminAvatar';
import { AdminSeatPickerPanel } from '@/components/admin/AdminSeatPickerModal';
import { searchMembers } from '@/lib/adminMemberSearch';
import { isValidRenewStartDate, minRenewStartDate, renewStartDateHint } from '@/lib/adminRenewDates';
import { Button } from '@/components/ui/Button';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { api, type AdminManualEnrollResult } from '@/lib/api';
import {
  MANUAL_PAYMENT_METHODS,
  defaultDurationKey,
  durationOptionsForPlan,
  marketingPlanToKind,
  type ManualPlanKind,
} from '@/lib/adminPricing';
import { computeOrderAmountRupees } from '@/lib/membershipPricing';
import {
  formatDate,
  membershipPlanKindLabel,
  planName,
  verificationStatusLabel,
  type Member,
} from '@/lib/members';
import { useLibraryInfo } from '@/components/library/LibraryInfoProvider';
import {
  DEVICE_USER_ID_SEARCH_PLACEHOLDER,
  deviceUserIdInlineLabel,
} from '@/lib/deviceUserIdLabel';
import { MembershipStatusBadge } from '@/components/admin/MembershipStatusBadge';

type Props = {
  visible: boolean;
  token: string;
  onClose: () => void;
  onSuccess: (result: AdminManualEnrollResult) => void;
};

type Step = 'search' | 'enroll';

export function RenewMemberSheet({ visible, token, onClose, onSuccess }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const lib = useLibraryInfo();

  const [step, setStep] = useState<Step>('search');
  const [roster, setRoster] = useState<Member[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [selected, setSelected] = useState<Member | null>(null);

  const [planKind, setPlanKind] = useState<ManualPlanKind>('long_term');
  const [durationKey, setDurationKey] = useState(defaultDurationKey('long_term'));
  const [seat, setSeat] = useState('');
  const [startDate, setStartDate] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<(typeof MANUAL_PAYMENT_METHODS)[number]['key']>('cash');
  const [externalRef, setExternalRef] = useState('');
  const [staffNote, setStaffNote] = useState('');
  const [seatPickerOpen, setSeatPickerOpen] = useState(false);
  const [amountTouched, setAmountTouched] = useState(false);
  const [busy, setBusy] = useState(false);

  const resetAll = useCallback(() => {
    setStep('search');
    setSearchQ('');
    setSelected(null);
    setPlanKind('long_term');
    setDurationKey(defaultDurationKey('long_term'));
    setSeat('');
    setStartDate('');
    setAmount('');
    setMethod('cash');
    setExternalRef('');
    setStaffNote('');
    setSeatPickerOpen(false);
    setAmountTouched(false);
  }, []);

  useEffect(() => {
    if (!visible) {
      resetAll();
      return;
    }
    let cancelled = false;
    setRosterLoading(true);
    void (async () => {
      try {
        const list = await api.adminMembersList(token);
        if (!cancelled) setRoster(list);
      } catch {
        if (!cancelled) setRoster([]);
      } finally {
        if (!cancelled) setRosterLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, token, resetAll]);

  const searchResults = useMemo(() => searchMembers(roster, searchQ), [roster, searchQ]);

  const minStart = useMemo(() => {
    if (!selected) return '';
    return minRenewStartDate(selected.expiryDate);
  }, [selected]);

  const durationOpts = durationOptionsForPlan(planKind);
  const catalogAmount = useMemo(() => computeOrderAmountRupees(planKind, durationKey), [planKind, durationKey]);

  useEffect(() => {
    if (amountTouched || catalogAmount == null) return;
    setAmount(String(catalogAmount));
  }, [catalogAmount, planKind, durationKey, amountTouched]);

  const selectedSeatNum = useMemo(() => {
    const n = parseInt(seat.trim(), 10);
    return Number.isFinite(n) && n >= 1 ? n : null;
  }, [seat]);

  const pickMember = useCallback((m: Member) => {
    if (m.plan === 'account') {
      Alert.alert(
        'No membership yet',
        'This person has no paid membership on file. Use Members → Add → New member instead.',
      );
      return;
    }
    const pk = m.planKind ? (m.planKind as ManualPlanKind) : marketingPlanToKind(m.plan);
    const min = minRenewStartDate(m.expiryDate);
    const prevSeat = m.seatNo !== '—' ? m.seatNo.replace(/\D/g, '') : '';
    setSelected(m);
    setPlanKind(pk);
    setDurationKey(defaultDurationKey(pk));
    setStartDate(min);
    setSeat(prevSeat);
    setAmountTouched(false);
    setStep('enroll');
  }, []);

  const openSeatPicker = useCallback(() => {
    if (!selected || !minStart) return;
    if (!isValidRenewStartDate(startDate.trim(), minStart)) {
      Alert.alert('Start date', renewStartDateHint(selected.expiryDate, minStart));
      return;
    }
    setSeatPickerOpen(true);
  }, [minStart, selected, startDate]);

  const handleClose = useCallback(() => {
    if (busy) return;
    resetAll();
    onClose();
  }, [busy, onClose, resetAll]);

  async function submit() {
    if (!selected?.userId) return;
    const seatN = parseInt(seat.trim(), 10);
    const amountN = parseInt(amount.trim(), 10);
    if (!Number.isFinite(seatN) || seatN < 1) {
      Alert.alert('Seat required', 'Choose a free seat on the map.');
      return;
    }
    if (!Number.isFinite(amountN) || amountN < 1) {
      Alert.alert('Invalid amount', 'Enter amount collected in whole rupees.');
      return;
    }
    if (!isValidRenewStartDate(startDate.trim(), minStart)) {
      Alert.alert('Start date', renewStartDateHint(selected.expiryDate, minStart));
      return;
    }

    setBusy(true);
    try {
      const result = await api.adminManualEnroll(token, {
        existing_user_id: selected.userId,
        plan_kind: planKind,
        seat_number: seatN,
        membership_start_date: startDate.trim(),
        duration_key: durationKey,
        amount_rupees: amountN,
        payment_method: method,
        external_reference: externalRef.trim() || undefined,
        staff_note: staffNote.trim() || undefined,
        mark_kyc_verified: false,
      });
      onSuccess(result);
      resetAll();
      onClose();
      Alert.alert(
        'Renewal recorded',
        `${deviceUserIdInlineLabel(result.device_user_id)} · new membership saved.`,
      );
    } catch (e: unknown) {
      Alert.alert('Failed', e instanceof Error ? e.message : 'Renewal failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={[styles.root, { backgroundColor: c.surfaceMuted }]}>
        {seatPickerOpen && selected ? (
          <AdminSeatPickerPanel
            token={token}
            planKind={planKind}
            startDate={startDate.trim()}
            durationKey={durationKey}
            selectedSeatId={selectedSeatNum}
            onSelect={(n) => setSeat(String(n))}
            onClose={() => setSeatPickerOpen(false)}
          />
        ) : (
          <>
            <View style={[styles.header, { borderBottomColor: c.border }]}>
              <Text style={[styles.title, { color: c.ink900 }]}>Renew membership</Text>
              <Text style={[styles.hint, { color: c.ink600 }]}>
                {step === 'search'
                  ? 'Find the member, then choose plan, dates, and seat.'
                  : 'Confirm details, then set the new period and payment.'}
              </Text>
              <Pressable onPress={handleClose} accessibilityRole="button" style={styles.closeHit}>
                <Text style={{ color: c.azure600, fontWeight: '600' }}>Close</Text>
              </Pressable>
              {step === 'enroll' ? (
                <Pressable
                  onPress={() => {
                    setStep('search');
                    setSelected(null);
                  }}
                  accessibilityRole="button"
                  style={styles.backHit}
                >
                  <Text style={{ color: c.azure600, fontWeight: '600' }}>← Back</Text>
                </Pressable>
              ) : null}
            </View>

            <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
              {step === 'search' ? (
                <>
                  <Text style={[styles.label, { color: c.ink500 }]}>Find member</Text>
                  <TextInput
                    value={searchQ}
                    onChangeText={setSearchQ}
                    placeholder={DEVICE_USER_ID_SEARCH_PLACEHOLDER}
                    placeholderTextColor={c.ink400}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={[styles.input, { borderColor: c.border, color: c.ink900, backgroundColor: c.surface }]}
                  />
                  {rosterLoading ? <ActivityIndicator color={c.azure500} style={{ marginTop: 16 }} /> : null}
                  {!rosterLoading && searchQ.trim() && searchResults.length === 0 ? (
                    <Text style={[styles.empty, { color: c.ink500 }]}>No matches. Try device user id or email.</Text>
                  ) : null}
                  {searchResults.map((m) => (
                    <Pressable
                      key={m.userId}
                      onPress={() => pickMember(m)}
                      style={({ pressed }) => [
                        styles.resultRow,
                        { backgroundColor: c.surface, borderColor: c.border },
                        pressed && { opacity: 0.92 },
                      ]}
                    >
                      <AdminAvatar name={m.name} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.resultName, { color: c.ink900 }]}>{m.name}</Text>
                        <Text style={[styles.resultMeta, { color: c.ink600 }]}>
                          {deviceUserIdInlineLabel(m.libraryNumber)}
                          {m.plan !== 'account' ? ` · ${planName(lib, m.plan)} · Seat ${m.seatNo}` : ' · No membership'}
                        </Text>
                        {m.expiryDate ? (
                          <Text style={[styles.resultMeta, { color: c.ink500 }]}>
                            Ends {formatDate(m.expiryDate)}
                          </Text>
                        ) : null}
                      </View>
                      <MembershipStatusBadge member={m} />
                    </Pressable>
                  ))}
                </>
              ) : selected ? (
                <>
                  <View style={[styles.confirmCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                    <Text style={[styles.confirmTitle, { color: c.ink900 }]}>{selected.name}</Text>
                    <Text style={[styles.confirmLine, { color: c.ink600 }]}>
                      {deviceUserIdInlineLabel(selected.libraryNumber)} · {selected.email || '—'}
                    </Text>
                    <Text style={[styles.confirmLine, { color: c.ink600 }]}>
                      {membershipPlanKindLabel(selected.planKind)} · Seat {selected.seatNo} · {selected.windowLabel}
                    </Text>
                    <View style={styles.confirmBadges}>
                      <MembershipStatusBadge member={selected} align="start" />
                      <Text style={[styles.kycText, { color: c.ink500 }]}>
                        KYC: {verificationStatusLabel(selected.verificationStatus)}
                      </Text>
                    </View>
                    <Text style={[styles.dateHint, { color: c.azure700 }]}>
                      {renewStartDateHint(selected.expiryDate, minStart)}
                    </Text>
                  </View>

                  <Field label="Plan" c={c}>
                    <View style={styles.chips}>
                      {(['short_term', 'long_term'] as const).map((pk) => (
                        <Pressable
                          key={pk}
                          onPress={() => {
                            setPlanKind(pk);
                            setDurationKey(defaultDurationKey(pk));
                            setSeat('');
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

                  <Field label="New period starts (YYYY-MM-DD)" c={c}>
                    <TextInput
                      value={startDate}
                      onChangeText={(v) => {
                        setStartDate(v);
                        setSeat('');
                      }}
                      autoCapitalize="none"
                      placeholder={minStart}
                      placeholderTextColor={c.ink400}
                      style={[styles.input, { borderColor: c.border, color: c.ink900, backgroundColor: c.surface }]}
                    />
                  </Field>

                  <Field label="Seat for new period" c={c}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={openSeatPicker}
                      style={({ pressed }) => [
                        styles.seatPickerBtn,
                        { borderColor: c.border, backgroundColor: c.surface },
                        pressed && { opacity: 0.9 },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.seatPickerTitle, { color: c.ink900 }]}>
                          {selectedSeatNum != null
                            ? `${planKind === 'long_term' ? 'F' : 'S'}${selectedSeatNum} · Seat ${selectedSeatNum}`
                            : 'Select seat on map'}
                        </Text>
                        <Text style={[styles.seatPickerSub, { color: c.ink500 }]}>
                          Blue = free · Amber = taken for these dates
                        </Text>
                      </View>
                      <Text style={{ color: c.azure600, fontWeight: '700', fontSize: 15 }}>Choose</Text>
                    </Pressable>
                  </Field>

                  <View style={[styles.amountCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                    <View style={styles.amountHead}>
                      <Text style={[styles.amountLabel, { color: c.ink500 }]}>Amount (₹)</Text>
                      {catalogAmount != null ? (
                        <Pressable
                          onPress={() => {
                            setAmount(String(catalogAmount));
                            setAmountTouched(false);
                          }}
                          hitSlop={8}
                        >
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
                      style={[
                        styles.amountInput,
                        { borderColor: c.border, color: c.ink900, backgroundColor: c.surfaceMuted },
                      ]}
                    />
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

                  <Button
                    title={busy ? 'Saving…' : 'Record renewal'}
                    disabled={busy}
                    onPress={() => void submit()}
                  />
                </>
              ) : null}
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
  hint: { fontSize: 14, lineHeight: 20, paddingRight: 56 },
  closeHit: { position: 'absolute', top: Platform.OS === 'ios' ? 16 : 12, right: 20 },
  backHit: { marginTop: 4, alignSelf: 'flex-start' },
  body: { padding: 20, gap: 16, paddingBottom: 40 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: 16,
    minHeight: 48,
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  empty: { fontSize: 15, marginTop: 12 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  resultName: { fontSize: 16, fontWeight: '600' },
  resultMeta: { fontSize: 13, marginTop: 2 },
  confirmCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 6,
  },
  confirmTitle: { fontSize: 18, fontWeight: '700' },
  confirmLine: { fontSize: 14, lineHeight: 20 },
  confirmBadges: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  kycText: { fontSize: 13 },
  dateHint: { fontSize: 13, lineHeight: 18, marginTop: 8, fontWeight: '500' },
  field: { gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
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
});

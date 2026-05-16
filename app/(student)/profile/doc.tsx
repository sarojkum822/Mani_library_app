import React, { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/components/auth/AuthProvider';
import { useLibraryInfo } from '@/components/library/LibraryInfoProvider';
import { api, type DocumentState, type DocumentStatus, type DocumentType } from '@/lib/api';
import { MEMBERSHIP_INSTITUTION_OPTIONS, MEMBERSHIP_INSTITUTION_VALUES } from '@/lib/membershipInstitutionOptions';
import { sanitizeAadhaarLastFourInput, sanitizeRollNumberDigitsInput } from '@/lib/intakeFieldLimits';
import { planById } from '@/lib/membershipPlans';

type UploadTarget = { type: DocumentType; label: string };

const TARGETS: UploadTarget[] = [
  { type: 'aadhaar', label: 'Aadhaar Card' },
  { type: 'student_id', label: 'Student ID' },
];

function badge(status: DocumentState['status']) {
  if (status === 'verified') return 'Verified';
  if (status === 'pending') return 'Pending';
  if (status === 'rejected') return 'Rejected';
  return 'Not uploaded';
}

/** Matches `/api/me/verification/document` — no new uploads when account is approved or fully rejected. */
function verificationAllowsNewUploads(verificationStatus: string): boolean {
  const v = (verificationStatus || 'none').toLowerCase();
  if (v === 'approved' || v === 'rejected') return false;
  return true;
}

function showDocumentUploadButton(verificationStatus: string, docStatus: DocumentStatus | undefined): boolean {
  if (!verificationAllowsNewUploads(verificationStatus)) return false;
  if (docStatus === 'verified') return false;
  return true;
}

function normalizeParam(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function intakeValid(last4: string, institution: string): boolean {
  return /^\d{4}$/.test(last4) && MEMBERSHIP_INSTITUTION_VALUES.has(institution);
}

export default function StudentDocScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();
  const { auth } = useAuth();
  const lib = useLibraryInfo();
  const token = auth.status === 'signed_in' ? auth.token : null;

  const params = useLocalSearchParams<{
    afterSeat?: string | string[];
    planId?: string | string[];
    intent?: string | string[];
    seatCode?: string | string[];
    membershipCheckout?: string | string[];
    planKind?: string | string[];
    durationKey?: string | string[];
    membershipStartDate?: string | string[];
    seatNumber?: string | string[];
  }>();
  const afterSeat = normalizeParam(params.afterSeat) === '1';
  const planId = normalizeParam(params.planId);
  const intent = normalizeParam(params.intent) === 'renew' ? 'renew' : 'buy';
  const seatCode = normalizeParam(params.seatCode);
  const membershipCheckout = normalizeParam(params.membershipCheckout) === '1';
  const planKind = normalizeParam(params.planKind);
  const durationKey = normalizeParam(params.durationKey);
  const membershipStartDate = normalizeParam(params.membershipStartDate);
  const seatNumber = normalizeParam(params.seatNumber);
  const plan = planId ? planById(lib, planId) : undefined;

  const canGoToPayment =
    membershipCheckout &&
    intent === 'buy' &&
    (planKind === 'short_term' || planKind === 'long_term') &&
    !!durationKey &&
    !!membershipStartDate &&
    !!seatNumber &&
    /^\d+$/.test(seatNumber);

  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({
      title: afterSeat ? 'Verify identity' : 'Documents',
    });
  }, [navigation, afterSeat]);

  /** Paid members can keep stale `membershipCheckout` query params on the Doc tab — reset to plain uploads. */
  useFocusEffect(
    useCallback(() => {
      if (!token || !afterSeat || !membershipCheckout || !canGoToPayment) return;
      let cancelled = false;
      void (async () => {
        try {
          const m = await api.membership(token);
          if (cancelled) return;
          if (m.status === 'active' || m.status === 'expiring_soon') {
            router.replace('/(student)/profile/doc');
          }
        } catch {
          /* ignore */
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [token, afterSeat, membershipCheckout, canGoToPayment]),
  );

  const [docs, setDocs] = useState<DocumentState[]>([]);
  const [verificationStatus, setVerificationStatus] = useState<string>('none');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<DocumentType | null>(null);

  const [last4, setLast4] = useState('');
  const [roll, setRoll] = useState('');
  const [institution, setInstitution] = useState('');
  const [preparing, setPreparing] = useState('');
  const [continueBusy, setContinueBusy] = useState(false);

  const byType = useMemo(() => {
    const m = new Map<DocumentType, DocumentState>();
    for (const d of docs) m.set(d.type, d);
    return m;
  }, [docs]);

  const intakeOk = !afterSeat || intakeValid(last4, institution);

  const loadIntakeFromProfile = useCallback(async () => {
    if (!token || !afterSeat) return;
    try {
      const p = await api.memberProfile(token);
      const l4 = (p.aadhaarLastFour ?? '').replace(/\D/g, '').slice(0, 4);
      const inst = (p.institutionType ?? '').trim();
      const instOk = MEMBERSHIP_INSTITUTION_VALUES.has(inst) ? inst : '';
      setLast4(l4);
      setRoll(sanitizeRollNumberDigitsInput(String(p.studentRollNumber ?? '')));
      setInstitution(instOk);
      setPreparing(p.preparingFor ?? '');
    } catch {
      /* Prefill optional — server may not expose member-profile yet */
    }
  }, [token, afterSeat]);

  async function refresh() {
    if (!token) {
      setDocs([]);
      setVerificationStatus('none');
      setLast4('');
      setRoll('');
      setInstitution('');
      setPreparing('');
      setLoading(false);
      return;
    }
    if (!afterSeat) {
      setLast4('');
      setRoll('');
      setInstitution('');
      setPreparing('');
    }
    setLoading(true);
    try {
      const pack = await api.documents(token);
      setDocs(pack.items);
      setVerificationStatus(pack.verificationStatus);
      if (afterSeat) await loadIntakeFromProfile();
    } catch {
      setDocs([]);
      setVerificationStatus('none');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, afterSeat]);

  async function pickAndUpload(type: DocumentType) {
    if (!token) return;
    const row = byType.get(type);
    if (!showDocumentUploadButton(verificationStatus, row?.status)) {
      Alert.alert('Upload not needed', 'This document is already verified or uploads are closed for your account.');
      return;
    }

    setUploading(type);
    try {
      const allowImage = await AlertPrompt(
        'Upload document',
        'Choose how you want to upload',
        [
          { id: 'image', label: 'Use Camera / Gallery' },
          { id: 'file', label: 'Pick a File (PDF/Image)' },
        ]
      );
      if (allowImage === '__cancel__') return;

      let fileName = `${type}.jpg`;
      let mimeType = 'image/jpeg';
      let base64: string | undefined;

      if (allowImage === 'image') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) throw new Error('Media permission not granted');

        const res = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: false,
          base64: true,
          quality: 0.85,
        });
        if (res.canceled) return;
        base64 = res.assets[0]?.base64 ?? undefined;
        fileName = res.assets[0]?.fileName ?? fileName;
        mimeType = res.assets[0]?.mimeType ?? mimeType;
      } else {
        const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
        if (res.canceled) return;
        const a = res.assets?.[0];
        if (!a) return;
        fileName = a.name ?? fileName;
        mimeType = a.mimeType ?? mimeType;
        // DocumentPicker doesn't provide base64 directly; for backend-ready structure we require base64.
        // In real integration, use file upload (multipart) endpoint. For now, show message.
        Alert.alert('Large files', 'Please choose a photo from your gallery for now. PDF support is coming soon.');
        // Fallback: use ImagePicker if you want base64; keep file flow as "not supported" for now.
        throw new Error('Please use Camera / Gallery for this upload.');
      }

      if (!base64) throw new Error('No file data found');
      await api.uploadDocument(token, { type, fileName, mimeType, base64 });
      await refresh();
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message ?? 'Unknown error');
    } finally {
      setUploading(null);
    }
  }

  const screenSubtitle = afterSeat
    ? canGoToPayment
      ? 'Add your details, then continue to payment. Document uploads are optional and you can add them later from your profile.'
      : 'Add your details to continue. You can upload ID documents anytime—they are optional for this step.'
    : 'Upload Aadhaar and student ID for verification';

  async function onContinueAfterSeat() {
    if (!token || !intakeValid(last4, institution)) return;

    if (canGoToPayment && planId && planKind && durationKey && membershipStartDate && seatNumber) {
      router.push({
        pathname: '/(student)/membership/checkout',
        params: {
          planId,
          planKind,
          durationKey,
          membershipStartDate,
          seatNumber,
          intakeLast4: last4,
          intakeRoll: sanitizeRollNumberDigitsInput(roll),
          intakeInstitution: institution,
          intakePreparing: preparing.trim(),
        },
      });
      return;
    }

    setContinueBusy(true);
    try {
      await api.updateProfileIntake(token, {
        aadhaar_last_four: last4,
        student_roll_number: sanitizeRollNumberDigitsInput(roll) || null,
        institution_type: institution,
        preparing_for: preparing.trim() || null,
      });
      Alert.alert(
        'Thank you',
        `We have your details for desk ${seatCode ?? '—'}. The library team will follow up as needed.`,
        [{ text: 'OK', onPress: () => router.replace('/(student)/membership') }],
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not save your details.';
      Alert.alert('Could not save', msg);
    } finally {
      setContinueBusy(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: c.surfaceMuted }]}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 12) + 24 + (afterSeat && token ? 88 : 0),
          gap: 12,
        }}
      >
        <Text style={{ color: c.ink600, fontSize: 15, lineHeight: 22, fontWeight: '400' }}>{screenSubtitle}</Text>
        {afterSeat && token ? (
          <Card style={{ padding: 16, gap: 8 }}>
            <Text style={{ color: c.ink900, fontSize: 12, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' }}>
              Your desk
            </Text>
            <Text style={{ color: c.ink700, fontSize: 15, fontWeight: '600' }}>
              {plan?.title ?? planId ?? 'Plan'} · {intent === 'renew' ? 'Renewal' : 'New'} · seat{' '}
              <Text style={{ fontWeight: '900' }}>{seatCode ?? '—'}</Text>
            </Text>
            <Text style={{ color: c.ink600, fontSize: 13, lineHeight: 19, fontWeight: '500' }}>
              Fill in your details below. You can upload Aadhaar or student ID here if you like—both are optional before you continue.
            </Text>
            {canGoToPayment && membershipStartDate ? (
              <Text style={{ color: c.ink500, fontSize: 12, fontWeight: '600', marginTop: 4 }}>
                Your membership begins on {membershipStartDate}.
              </Text>
            ) : null}
          </Card>
        ) : null}

        {afterSeat && token ? (
          <Card style={{ padding: 16, gap: 14 }}>
            <Text style={{ color: c.ink900, fontSize: 12, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' }}>
              Your details
            </Text>
            <Text style={{ color: c.ink600, fontSize: 13, lineHeight: 19, fontWeight: '500' }}>
              A few details help the library confirm who you are and what you are studying.
            </Text>
            <TextField
              label="Aadhaar — last 4 digits only"
              value={last4}
              onChangeText={(t) => setLast4(sanitizeAadhaarLastFourInput(t))}
              placeholder="e.g. 1234"
              keyboardType="number-pad"
              maxLength={4}
            />
            <TextField
              label="Roll / member ID (numbers only, up to 8 digits)"
              value={roll}
              onChangeText={(t) => setRoll(sanitizeRollNumberDigitsInput(t))}
              placeholder="Optional"
              keyboardType="number-pad"
              maxLength={8}
            />
            <View style={{ gap: 8 }}>
              <Text style={{ color: c.ink700, fontSize: 13, fontWeight: '600' }}>Institution</Text>
              <View style={styles.chipRow}>
                {MEMBERSHIP_INSTITUTION_OPTIONS.map((opt) => {
                  const selected = institution === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => {
                        setInstitution(opt.value);
                      }}
                      style={[
                        styles.chip,
                        { borderColor: selected ? c.azure500 : c.border, backgroundColor: selected ? c.azure50 : c.surface },
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
              label="Preparing for (exam or goal)"
              value={preparing}
              onChangeText={(t) => {
                setPreparing(t);
              }}
              placeholder="e.g. UPSC, Bihar Board 12th"
            />
            <Text style={{ color: c.ink500, fontSize: 12, fontWeight: '500' }}>
              {canGoToPayment
                ? 'Your answers are kept on this device until payment succeeds, then they are saved to your library profile.'
                : 'When you continue, we save these details to your library profile.'}
            </Text>
          </Card>
        ) : null}

        {!token ? (
          <Card style={{ paddingHorizontal: 18, paddingVertical: 18, gap: 14 }}>
            <Text style={{ color: c.ink900, fontSize: 12, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' }}>
              Verification
            </Text>
            <Text style={{ color: c.ink600, fontSize: 14, lineHeight: 22, fontWeight: '500' }}>
              When you are ready to join, sign in to upload Aadhaar and student ID—we sync status with your membership.
              The Doc tab shows in the navigation bar only after sign-in.
            </Text>
            <Button title="Sign in" onPress={() => router.push('/(auth)/login')} />
          </Card>
        ) : (
          <Fragment>
            {TARGETS.map((t) => {
              const d = byType.get(t.type);
              const canUpload = showDocumentUploadButton(verificationStatus, d?.status);
              return (
                <Card key={t.type} style={{ padding: 16 }}>
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: c.ink900, fontSize: 15, fontWeight: '600' }}>{t.label}</Text>
                      <Text style={{ color: c.ink600, fontSize: 12, fontWeight: '500', marginTop: 6 }}>
                        Status: {loading ? 'Loading…' : badge(d?.status ?? 'not_uploaded')}
                      </Text>
                      {d?.status === 'rejected' && d.rejectionReason ? (
                        <Text style={{ color: c.ink700, fontSize: 12, fontWeight: '500', marginTop: 6 }}>
                          Reason: {d.rejectionReason}
                        </Text>
                      ) : null}
                    </View>

                    {canUpload ? (
                      <Button
                        title={uploading === t.type ? 'Uploading…' : 'Upload'}
                        disabled={!token || uploading != null}
                        onPress={() => void pickAndUpload(t.type)}
                        style={{ alignSelf: 'flex-start', paddingHorizontal: 16 }}
                      />
                    ) : (
                      <Text
                        style={{
                          alignSelf: 'center',
                          color: c.ink500,
                          fontSize: 13,
                          fontWeight: '600',
                          paddingVertical: 10,
                          paddingHorizontal: 4,
                        }}
                      >
                        {d?.status === 'verified' ? 'On file' : 'Uploads closed'}
                      </Text>
                    )}
                  </View>
                </Card>
              );
            })}
          </Fragment>
        )}

        {token ? (
        <Pressable onPress={() => void refresh()} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
          <Text style={{ color: c.azure600, fontWeight: '600' }}>Refresh verification status</Text>
        </Pressable>
        ) : null}
      </ScrollView>

      {afterSeat && token ? (
        <View
          style={[
            styles.postSeatBar,
            {
              borderTopColor: c.border,
              backgroundColor: c.surface,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          <Button
            title={
              continueBusy
                ? 'Saving…'
                : !intakeValid(last4, institution)
                  ? 'Fill in your details'
                  : canGoToPayment
                    ? 'Continue to payment'
                    : 'Back to membership'
            }
            disabled={!intakeOk || continueBusy}
            onPress={() => void onContinueAfterSeat()}
          />
        </View>
      ) : null}
    </View>
  );
}

async function AlertPrompt(
  title: string,
  message: string,
  options: { id: string; label: string }[]
): Promise<string> {
  return await new Promise((resolve) => {
    const buttons = [
      ...options.map((o) => ({ text: o.label, onPress: () => resolve(o.id) })),
      { text: 'Cancel', style: 'cancel' as const, onPress: () => resolve('__cancel__') },
    ];
    Alert.alert(title, message, buttons, {
      cancelable: true,
      onDismiss: () => resolve('__cancel__'),
    });
  });
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  postSeatBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
});


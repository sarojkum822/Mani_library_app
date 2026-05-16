import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/components/auth/AuthProvider';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { api, deviceUserIdDisplayFromProfile, type MemberProfile } from '@/lib/api';
import { formatDisplayName } from '@/lib/displayName';
import { InfoRow, institutionLabel, verificationLabel, verificationTone } from '@/components/student/profileShared';

export default function ProfileDetailsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();
  const { auth } = useAuth();
  const user = auth.status === 'signed_in' ? auth.user : null;
  const token = auth.status === 'signed_in' ? auth.token : null;

  const [memberProfile, setMemberProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setMemberProfile(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const p = await api.memberProfile(token);
      setMemberProfile(p);
    } catch (e: unknown) {
      setMemberProfile(null);
      setError(e instanceof Error ? e.message : 'Could not load profile.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const displayName = formatDisplayName(memberProfile?.name ?? user?.name) || (memberProfile?.name ?? user?.name ?? '—');

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.surfaceMuted }}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: Math.max(insets.bottom, 20) + 24,
      }}
      keyboardShouldPersistTaps="handled"
    >
      {error ? (
        <Card style={{ padding: 16, marginTop: 14, borderColor: c.border }}>
          <Text style={{ color: c.ink900, fontWeight: '600' }}>Could not load</Text>
          <Text style={{ marginTop: 6, color: c.ink600, fontSize: 13, lineHeight: 19 }}>{error}</Text>
          <Button title="Try again" onPress={() => void load()} style={{ marginTop: 12 }} />
        </Card>
      ) : null}

      <Card style={{ padding: 0, overflow: 'hidden', marginTop: 14 }}>
        <View style={[styles.section, { backgroundColor: c.surfaceMuted, borderBottomColor: c.ink100 }]}>
          <Text style={[styles.kicker, { color: c.ink500 }]}>Your library profile</Text>
          {loading && !memberProfile ? (
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <ActivityIndicator color={c.azure500} />
            </View>
          ) : (
            <View style={{ marginTop: 12 }}>
              <View style={[styles.libRow, { borderBottomColor: c.ink100 }]}>
                <Text style={[styles.libLabel, { color: c.ink500 }]}>Device user id</Text>
                <Text style={[styles.libValue, { color: c.azure600 }]}>
                  {loading && !memberProfile ? '…' : deviceUserIdDisplayFromProfile(memberProfile)}
                </Text>
              </View>
              <InfoRow label="Name" value={displayName} />
              <InfoRow label="Phone" value={memberProfile?.phone ?? user?.phone ?? '—'} />
              <InfoRow label="Email" value={memberProfile?.email ?? user?.email ?? '—'} />
              <View style={[styles.verifyRow, { borderBottomColor: c.ink100, borderBottomWidth: 0 }]}>
                <Text style={[styles.smallLab, { color: c.ink500 }]}>ID verification</Text>
                <StatusBadge
                  tone={verificationTone(memberProfile?.verificationStatus ?? 'none')}
                  label={verificationLabel(memberProfile?.verificationStatus ?? 'none')}
                />
              </View>
            </View>
          )}
        </View>

        <View style={[styles.section, { backgroundColor: c.surfaceMuted, borderBottomWidth: 0 }]}>
          {loading && !memberProfile ? (
            <View style={{ paddingVertical: 16, alignItems: 'center' }}>
              <ActivityIndicator color={c.azure500} />
            </View>
          ) : (
            <View>
              <InfoRow label="Aadhaar (last 4)" value={memberProfile?.aadhaarLastFour?.trim() || '—'} />
              <InfoRow label="Roll / registration no." value={memberProfile?.studentRollNumber?.trim() || '—'} />
              <InfoRow label="Institution" value={institutionLabel(memberProfile?.institutionType)} />
              <InfoRow label="Preparing for" value={memberProfile?.preparingFor?.trim() || '—'} last />
            </View>
          )}
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  kicker: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', textAlign: 'left' },
  libRow: { paddingBottom: 14, marginBottom: 4, borderBottomWidth: StyleSheet.hairlineWidth },
  libLabel: { fontSize: 12, fontWeight: '600' },
  libValue: { marginTop: 6, fontSize: 26, fontWeight: '700', fontFamily: 'SpaceMono', letterSpacing: 0.5 },
  verifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  smallLab: { fontSize: 12, fontWeight: '600' },
});

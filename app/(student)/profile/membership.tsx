import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StudentSectionLabel } from '@/components/student/StudentSectionLabel';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/components/auth/AuthProvider';
import { useMemberPrefetch } from '@/components/member/MemberPrefetchProvider';
import { Card } from '@/components/ui/Card';
import { SettingsRow } from '@/components/ui/SettingsRow';
import { Button } from '@/components/ui/Button';
import { api, type Membership } from '@/lib/api';

export default function ProfileMembershipScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();
  const { auth } = useAuth();
  const mp = useMemberPrefetch();
  const token = auth.status === 'signed_in' ? auth.token : null;
  const isStudent = auth.status === 'signed_in' && auth.user.role === 'student';

  const [nonStudentMembership, setNonStudentMembership] = useState<Membership | null>(null);
  const [nonStudentLoading, setNonStudentLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token || isStudent) {
        setNonStudentMembership(null);
        setNonStudentLoading(false);
        return;
      }
      setNonStudentLoading(true);
      try {
        const m = await api.membership(token);
        if (!cancelled) setNonStudentMembership(m);
      } catch {
        if (!cancelled) setNonStudentMembership(null);
      } finally {
        if (!cancelled) setNonStudentLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, isStudent]);

  const loading = isStudent ? !mp.accountReady : nonStudentLoading;
  const membership = isStudent ? mp.membership : nonStudentMembership;
  const prefetchError = isStudent ? mp.prefetchError : null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.surfaceMuted }}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: Math.max(insets.bottom, 20) + 24,
      }}
    >
      {prefetchError ? (
        <Card style={{ padding: 14, marginBottom: 12, gap: 8 }}>
          <Text style={{ color: c.ink700, fontSize: 15, lineHeight: 22 }}>{prefetchError}</Text>
          <Button title="Try again" variant="secondary" onPress={() => void mp.refetch()} />
        </Card>
      ) : null}

      <Card style={{ padding: 0, overflow: 'hidden', marginTop: 14 }}>
        {loading ? (
          <View style={{ paddingVertical: 28, alignItems: 'center' }}>
            <ActivityIndicator color={c.azure500} />
            <Text style={{ color: c.ink500, fontSize: 14, marginTop: 12 }}>Loading membership…</Text>
          </View>
        ) : membership && membership.status !== 'none' ? (
          <View style={{ paddingHorizontal: 16, paddingVertical: 16, gap: 8 }}>
            <Text style={{ color: c.ink900, fontSize: 22, fontWeight: '700', letterSpacing: -0.3 }}>
              {membership.planName ?? 'Membership'}
            </Text>
            <Text style={{ color: c.ink600, fontSize: 16, fontWeight: '400', lineHeight: 22 }}>
              {[membership.floor, membership.seatNo ? `Seat ${membership.seatNo}` : null].filter(Boolean).join(' · ') || '—'}
            </Text>
            {membership.deviceUserId ? (
              <Text style={{ color: c.ink500, fontSize: 14, fontWeight: '500' }}>Device user id · {membership.deviceUserId}</Text>
            ) : null}
            {membership.daysLeft != null && membership.status !== 'expired' ? (
              <Text style={{ color: c.ink500, fontSize: 15, fontWeight: '400', marginTop: 4 }}>
                {membership.daysLeft} day{membership.daysLeft === 1 ? '' : 's'} left in the current window
              </Text>
            ) : null}
            {membership.expiresAt ? (
              <Text style={{ color: c.ink500, fontSize: 15, fontWeight: '400' }}>
                Through{' '}
                {new Date(membership.expiresAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            ) : null}
            <Pressable onPress={() => router.push('/(student)/membership')} style={{ marginTop: 16 }}>
              <Text style={{ color: c.azure600, fontSize: 17, fontWeight: '600' }}>Open membership & plans</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16, paddingVertical: 20 }}>
            <Text style={{ color: c.ink500, fontSize: 16, fontWeight: '400', lineHeight: 22 }}>
              No active membership right now.
            </Text>
            <Pressable onPress={() => router.push('/(student)/membership')} style={{ marginTop: 12 }}>
              <Text style={{ color: c.azure600, fontSize: 17, fontWeight: '600' }}>View plans</Text>
            </Pressable>
          </View>
        )}
      </Card>

      <StudentSectionLabel title="Related" />
      <Card style={{ padding: 0, overflow: 'hidden', marginTop: 6 }}>
        <SettingsRow
          iconIon="wallet-outline"
          title="Payments"
          subtitle="Receipts, renewals, and payment status"
          onPress={() => router.push('/(student)/profile/transactions')}
          showSeparator={false}
        />
      </Card>
    </ScrollView>
  );
}

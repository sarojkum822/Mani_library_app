import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, useFocusEffect } from 'expo-router';

import { CLARITY_MONO } from '@/components/admin/clarityTokens';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Screen, textStyles } from '@/components/ui/Screen';
import { useAuth } from '@/components/auth/AuthProvider';
import { useLibraryInfo } from '@/components/library/LibraryInfoProvider';
import { useMemberPrefetch } from '@/components/member/MemberPrefetchProvider';
import { api, deviceUserIdDisplayFromProfile, type Membership } from '@/lib/api';
import { seatMapPlanIdForMarketingPlan } from '@/lib/marketingPlanSeatPreview';

function statusLabel(m: Membership) {
  if (m.status === 'upcoming') return 'Starts soon';
  if (m.status === 'active') return 'Active';
  if (m.status === 'expiring_soon') return 'Expiring soon';
  if (m.status === 'expired') return 'Expired';
  return 'Not active';
}

function formatStartDate(iso: string | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function StudentMembershipScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const { auth } = useAuth();
  const lib = useLibraryInfo();
  const mp = useMemberPrefetch();

  const token = auth.status === 'signed_in' ? auth.token : null;
  const isStudent = auth.status === 'signed_in' && auth.user.role === 'student';

  const [nonStudentData, setNonStudentData] = useState<Membership | null>(null);
  const [nonStudentLoading, setNonStudentLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token || isStudent) {
        setNonStudentData(null);
        setNonStudentLoading(false);
        return;
      }
      try {
        setNonStudentLoading(true);
        const m = await api.membership(token);
        let merged = m;
        if (!merged.deviceUserId) {
          try {
            const p = await api.memberProfile(token);
            const d = deviceUserIdDisplayFromProfile(p);
            if (d !== '—') merged = { ...merged, deviceUserId: d };
          } catch {
            /* ignore */
          }
        }
        if (!cancelled) setNonStudentData(merged);
      } catch {
        if (!cancelled) setNonStudentData(null);
      } finally {
        if (!cancelled) setNonStudentLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, isStudent]);

  const data = isStudent ? mp.membership : nonStudentData;
  const bundleLoading = isStudent ? !mp.accountReady : nonStudentLoading;
  const prefetchError = isStudent ? mp.prefetchError : null;

  const accent = useMemo(() => {
    if (!data) return c.ink600;
    return data.status === 'expired' ? c.ink700 : data.status === 'expiring_soon' ? c.azure700 : c.ink700;
  }, [c, data]);

  const hasSubscription = data && data.status !== 'none';
  const isUpcoming = data?.status === 'upcoming';
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    if (!isStudent || !token) return;
    setRefreshing(true);
    try {
      await mp.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [isStudent, token, mp]);

  useFocusEffect(
    useCallback(() => {
      if (!isStudent || !token || !mp.accountReady) return;
      void mp.refetch();
    }, [isStudent, token, mp.accountReady, mp.refetch]),
  );

  if (!token) {
    return (
      <Screen title="Membership" subtitle="Your library membership" scrollable>
        <Card style={styles.signedOutCard}>
          <Text style={[styles.signedOutIntro, { color: c.ink900 }]}>Sign in to unlock</Text>
          <Text style={[textStyles.body, styles.signedOutCopy, { color: c.ink600 }]}>
            Explore Mani Library on Home first. After you sign in, this tab shows your plan, expiry, renewal, and
            cabin seat—all in one place.
          </Text>
          <Button title="Sign in" onPress={() => router.push('/(auth)/login')} />
        </Card>

        <View
          style={styles.signedOutHint}
          accessibilityLabel="After sign-in you will see your plan, renewal, and seat here."
        >
          <FontAwesome name="credit-card" size={36} color={c.ink300} style={styles.signedOutHintIcon} />
          <Text style={[styles.signedOutHintTitle, { color: c.ink800 }]}>Member tools stay hidden until you sign in</Text>
          <Text style={[styles.signedOutHintCopy, { color: c.ink500 }]}>
            The Membership tab appears in the bar at the bottom after sign-in—it stays out of the way while you browse.
          </Text>
        </View>
      </Screen>
    );
  }

  if (bundleLoading) {
    return (
      <Screen title="Membership" subtitle="Your plan, seat, and renewal" scrollable>
        <Card style={{ padding: 28, alignItems: 'center', gap: 12 }}>
          <ActivityIndicator color={c.azure500} />
          <Text style={[textStyles.body, { color: c.ink600, textAlign: 'center' }]}>Loading your membership…</Text>
        </Card>
      </Screen>
    );
  }

  const seatBlock = hasSubscription ? (
    <Card style={{ padding: 0, overflow: 'hidden', marginTop: 12 }}>
      <View style={[styles.seatBanner, { backgroundColor: c.azure50, borderBottomColor: c.azure200 }]}>
        <Text style={[styles.seatBannerLabel, { color: c.azure700 }]}>Your library spot</Text>
        <Text style={[styles.seatNo, { color: c.ink900 }]}>{data?.seatNo ?? '—'}</Text>
        <Text style={[styles.seatFloor, { color: c.ink600 }]}>{data?.floor ?? '—'}</Text>
      </View>
    </Card>
  ) : (
    <Card style={{ padding: 16, marginTop: 12, gap: 8 }}>
      <Text style={[styles.kicker, { color: c.ink500 }]}>Your seat</Text>
      <Text style={[textStyles.body, { color: c.ink600, lineHeight: 20 }]}>
        After you buy a plan and pick a desk on the floor map, your seat number and floor will show here.
      </Text>
      <Button title="Buy membership" onPress={() => router.push('/(student)/membership/plans?intent=buy')} />
    </Card>
  );

  const renewCtaTitle =
    data?.status === 'expired'
      ? 'Renew membership'
      : data?.status === 'expiring_soon'
        ? 'Renew before expiry'
        : 'Renew or change plan';

  return (
    <Screen
      title="Membership"
      subtitle="Your plan, seat, and renewal"
      scrollable
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
    >
      {prefetchError ? (
        <Card style={{ padding: 14, marginBottom: 12, gap: 8 }}>
          <Text style={[textStyles.body, { color: c.ink700 }]}>{prefetchError}</Text>
          <Button title="Try again" variant="secondary" onPress={() => void mp.refetch()} />
        </Card>
      ) : null}

      {hasSubscription && data ? (
        <Card style={[styles.heroCard, { backgroundColor: c.azure50, borderColor: c.azure100 }]}>
          <Text style={[styles.kicker, { color: c.ink500 }]}>Membership</Text>
          <Text style={[styles.heroStatus, { color: accent }]}>{statusLabel(data)}</Text>
          <Text style={[textStyles.body, { color: c.ink700, marginTop: 4 }]} numberOfLines={2}>
            {data.planName ?? 'Your plan'}
            {data.seatNo ? ` · Seat ${data.seatNo}` : ''}
          </Text>
        </Card>
      ) : null}

      <Card style={styles.quickContext}>
        <View style={styles.quickContextInner}>
          <View style={[styles.quickItem, { backgroundColor: c.azure50 }]}>
            <FontAwesome name="map-marker" size={14} color={c.azure600} />
            <Text style={[styles.quickItemLabel, { color: c.ink700 }]} numberOfLines={1}>
              {lib.address.city}
            </Text>
          </View>
          <View style={[styles.quickItem, { backgroundColor: c.azure50 }]}>
            <FontAwesome name="users" size={14} color={c.azure600} />
            <Text style={[styles.quickItemLabel, { color: c.ink700 }]}>{lib.capacity}+ seats</Text>
          </View>
          <View style={[styles.quickItem, { backgroundColor: c.azure50 }]}>
            <FontAwesome name="clock-o" size={14} color={c.azure600} />
            <Text style={[styles.quickItemLabel, { color: c.ink700 }]} numberOfLines={1}>
              {lib.hours.split('·')[0]?.trim() ?? lib.hours}
            </Text>
          </View>
        </View>
      </Card>

      {hasSubscription ? (
        <Card style={{ padding: 16 }}>
          <Text style={[styles.kicker, { color: c.ink500 }]}>Status</Text>
          <Text style={[styles.value, { color: accent }]}>{data ? statusLabel(data) : '—'}</Text>

          <View style={{ marginTop: 10, gap: 6 }}>
            <Row label="Plan" value={data?.planName ?? '—'} />
            {isUpcoming ? (
              <Row label="Starts" value={formatStartDate(data?.startsAt)} />
            ) : (
              <>
                <Row label="Expires" value={data?.expiresAt ? new Date(data.expiresAt).toDateString() : '—'} />
                <Row label="Days left" value={data?.daysLeft != null ? String(data.daysLeft) : '—'} />
              </>
            )}
          </View>

          {isUpcoming ? (
            <Text style={[textStyles.body, { color: c.ink600, marginTop: 12, lineHeight: 20 }]}>
              Your payment is recorded. Access begins on the start date above — your seat is reserved until then.
            </Text>
          ) : null}

          <View style={{ marginTop: 16, gap: 10 }}>
            <Button
              title="View available seats"
              variant="secondary"
              onPress={() =>
                router.push({
                  pathname: '/(student)/membership/seat-map',
                  params: {
                    planId: seatMapPlanIdForMarketingPlan(data?.planMarketingId ?? 'main-hall'),
                    preview: '1',
                  },
                })
              }
            />
            {data?.renewPlanEligible ? (
              <>
                <Button title={renewCtaTitle} onPress={() => router.push('/(student)/membership/plans?intent=renew')} />
                <Text style={[textStyles.body, { color: c.ink500, lineHeight: 17 }]}>
                  Extend your current plan or switch plans, then pick a seat if you need a new desk.
                </Text>
              </>
            ) : null}
          </View>
        </Card>
      ) : null}

      {seatBlock}
    </Screen>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: c.ink500 }]}>{label}</Text>
      <Text
        style={[styles.rowValue, { color: c.ink900 }, mono && styles.rowMono]}
        numberOfLines={3}
        selectable={mono}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  signedOutCard: {
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  signedOutIntro: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  signedOutCopy: {
    lineHeight: 22,
    fontSize: 14,
    fontWeight: '500',
  },

  signedOutHint: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 24,
    maxWidth: 360,
    alignSelf: 'center',
  },
  signedOutHintIcon: { marginBottom: 12 },
  signedOutHintTitle: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
    textAlign: 'center',
    marginBottom: 8,
  },
  signedOutHintCopy: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19,
    textAlign: 'center',
  },

  heroCard: {
    padding: 16,
    marginBottom: 12,
    gap: 2,
    borderWidth: 1,
    borderRadius: 16,
  },
  heroStatus: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },

  quickContext: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderRadius: 16,
  },
  quickContextInner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },
  quickItemLabel: { fontSize: 12, fontWeight: '700' },

  kicker: { fontSize: 10, fontWeight: '600', letterSpacing: 1.4, textTransform: 'uppercase' },
  value: { marginTop: 6, fontSize: 16, fontWeight: '600' },
  row: { flexDirection: 'column', alignItems: 'flex-start', gap: 4, paddingVertical: 8 },
  rowLabel: { fontSize: 12, fontWeight: '600' },
  rowValue: { fontSize: 14, fontWeight: '600', textAlign: 'left', alignSelf: 'stretch' },
  rowMono: { fontFamily: CLARITY_MONO.fontFamily },
  seatBanner: { paddingHorizontal: 16, paddingVertical: 18, borderBottomWidth: 1 },
  seatBannerLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  seatNo: { marginTop: 8, fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  seatFloor: { marginTop: 6, fontSize: 14, fontWeight: '500' },
});

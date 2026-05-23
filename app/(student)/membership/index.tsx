import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';

import Colors from '@/constants/Colors';
import { type } from '@/constants/Typography';
import { useColorScheme } from '@/components/useColorScheme';
import { DetailRow } from '@/components/student/DetailRow';
import { StudentSectionLabel } from '@/components/student/StudentSectionLabel';
import { PaymentHistoryList } from '@/components/student/PaymentHistoryList';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Screen, textStyles } from '@/components/ui/Screen';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/components/auth/AuthProvider';
import { useLibraryInfo } from '@/components/library/LibraryInfoProvider';
import { useMemberPrefetch } from '@/components/member/MemberPrefetchProvider';
import { api, deviceUserIdDisplayFromProfile, type Membership, type ResumableCheckout } from '@/lib/api';
import {
  LONG_TERM_DURATION_OPTIONS,
  SHORT_TERM_DURATION_OPTIONS,
} from '@/lib/membershipPricing';
import { seatMapPlanIdForMarketingPlan } from '@/lib/marketingPlanSeatPreview';

function statusLabel(m: Membership) {
  if (m.status === 'upcoming') return 'Starts soon';
  if (m.status === 'active') return 'Active';
  if (m.status === 'expiring_soon') return 'Expiring soon';
  if (m.status === 'expired') return 'Expired';
  return 'Not active';
}

function statusTone(m: Membership): 'success' | 'warning' | 'danger' | 'neutral' {
  if (m.status === 'active') return 'success';
  if (m.status === 'expiring_soon' || m.status === 'upcoming') return 'warning';
  if (m.status === 'expired') return 'danger';
  return 'neutral';
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
  const [pendingCheckout, setPendingCheckout] = useState<ResumableCheckout | null>(null);
  const [pendingDismissing, setPendingDismissing] = useState(false);

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
  const coreLoading = isStudent ? mp.loading : nonStudentLoading;
  const prefetchError = isStudent ? mp.prefetchError : null;

  const hasSubscription = !coreLoading && data && data.status !== 'none';
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token || !isStudent) {
        if (!cancelled) setPendingCheckout(null);
        return;
      }
      try {
        const r = await api.resumableCheckout(token);
        if (!cancelled) setPendingCheckout(r);
      } catch {
        if (!cancelled) setPendingCheckout(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, isStudent]);

  const pendingDurationLabel = useMemo(() => {
    if (!pendingCheckout) return '';
    const list =
      pendingCheckout.planKind === 'short_term' ? SHORT_TERM_DURATION_OPTIONS : LONG_TERM_DURATION_OPTIONS;
    return list.find((o) => o.key === pendingCheckout.durationKey)?.label ?? pendingCheckout.durationKey;
  }, [pendingCheckout]);

  const dismissPendingCheckout = useCallback(async () => {
    if (!token || !pendingCheckout) return;
    setPendingDismissing(true);
    try {
      await api.markRazorpayCheckoutFailed(token, {
        payment_id: pendingCheckout.paymentId,
        error: { description: 'Member chose to start over from membership' },
      });
      setPendingCheckout(null);
    } finally {
      setPendingDismissing(false);
    }
  }, [token, pendingCheckout]);

  const continuePendingCheckout = useCallback(() => {
    if (!pendingCheckout) return;
    const planId = pendingCheckout.planKind === 'short_term' ? 'row-hall' : 'main-hall';
    router.push({
      pathname: '/(student)/membership/checkout',
      params: {
        planId,
        planKind: pendingCheckout.planKind,
        durationKey: pendingCheckout.durationKey,
        membershipStartDate: pendingCheckout.membershipStartDate,
        seatNumber: String(pendingCheckout.seatNumber),
      },
    });
  }, [pendingCheckout]);

  const paymentHistory = isStudent ? mp.payments : null;

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

  const seatBlock = coreLoading ? null : hasSubscription ? (
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

      {pendingCheckout ? (
        <Card style={{ padding: 14, marginBottom: 12, gap: 10, borderColor: '#fcd34d', backgroundColor: '#fffbeb' }}>
          <Text style={[styles.pendingTitle, { color: '#78350f' }]}>Continue where you left off</Text>
          <Text style={[textStyles.body, { color: '#92400e', lineHeight: 20 }]}>
            Seat {pendingCheckout.seatLabel}, starts {pendingCheckout.membershipStartDate}, {pendingDurationLabel}. Total
            ₹{pendingCheckout.amountRupees.toLocaleString('en-IN')}.
          </Text>
          <Button title="Continue payment" onPress={continuePendingCheckout} />
          <Button
            title={pendingDismissing ? 'Cancelling…' : 'Start over (discard checkout)'}
            variant="secondary"
            disabled={pendingDismissing}
            onPress={() => void dismissPendingCheckout()}
          />
        </Card>
      ) : null}

      {coreLoading ? (
        <Card style={{ padding: 28, alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <ActivityIndicator color={c.azure500} />
          <Text style={[textStyles.body, { color: c.ink600, textAlign: 'center' }]}>Loading plan details…</Text>
        </Card>
      ) : hasSubscription && data ? (
        <Card
          style={{
            ...styles.heroCard,
            backgroundColor: c.azure50,
            borderColor: c.azure100,
          }}
        >
          <View style={styles.heroTop}>
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <Text style={[styles.kicker, { color: c.ink500 }]}>Current plan</Text>
              <Text style={[type.headline, { color: c.ink900 }]} numberOfLines={2}>
                {data.planName ?? 'Membership'}
              </Text>
            </View>
            <StatusBadge tone={statusTone(data)} label={statusLabel(data)} />
          </View>
          <Card style={{ padding: 0, overflow: 'hidden', backgroundColor: c.surface }}>
            {isUpcoming ? (
              <DetailRow label="Starts" value={formatStartDate(data.startsAt)} />
            ) : (
              <>
                <DetailRow
                  label="Valid through"
                  value={
                    data.expiresAt
                      ? new Date(data.expiresAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'
                  }
                />
                <DetailRow
                  label="Days left"
                  value={data.daysLeft != null ? String(data.daysLeft) : '—'}
                  last
                />
              </>
            )}
          </Card>
          {isUpcoming ? (
            <Text style={[textStyles.body, { color: c.ink600, lineHeight: 20 }]}>
              Payment recorded. Access begins on the start date — your seat stays reserved until then.
            </Text>
          ) : null}
          <View style={{ gap: 10 }}>
            <Button
              title="View available seats"
              variant="secondary"
              onPress={() =>
                router.push({
                  pathname: '/(student)/membership/seat-map',
                  params: {
                    planId: seatMapPlanIdForMarketingPlan(data.planMarketingId ?? 'main-hall'),
                    preview: '1',
                  },
                })
              }
            />
            {data.renewPlanEligible ? (
              <Button title={renewCtaTitle} onPress={() => router.push('/(student)/membership/plans?intent=renew')} />
            ) : null}
          </View>
        </Card>
      ) : (
        <Card style={{ padding: 16, gap: 10 }}>
          <Text style={[type.headline, { color: c.ink900 }]}>No active membership</Text>
          <Text style={[textStyles.body, { color: c.ink600, lineHeight: 20 }]}>
            Choose a plan and seat to start studying at {lib.name}.
          </Text>
          <Button title="Buy membership" onPress={() => router.push('/(student)/membership/plans?intent=buy')} />
        </Card>
      )}

      {seatBlock}

      {paymentHistory && paymentHistory.length > 0 ? (
        <>
          <StudentSectionLabel title="Payment history" />
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <PaymentHistoryList rows={paymentHistory} />
          </Card>
        </>
      ) : null}
    </Screen>
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
  pendingTitle: { fontSize: 15, fontWeight: '700' },

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
    gap: 14,
    borderWidth: 1,
    borderRadius: 16,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  kicker: { fontSize: 10, fontWeight: '600', letterSpacing: 1.4, textTransform: 'uppercase' },
  seatBanner: { paddingHorizontal: 16, paddingVertical: 18, borderBottomWidth: 1 },
  seatBannerLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  seatNo: { marginTop: 8, fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  seatFloor: { marginTop: 6, fontSize: 14, fontWeight: '500' },
});

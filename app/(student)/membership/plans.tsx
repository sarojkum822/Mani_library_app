import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, useLocalSearchParams } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen, textStyles } from '@/components/ui/Screen';
import { useAuth } from '@/components/auth/AuthProvider';
import { useMemberPrefetch } from '@/components/member/MemberPrefetchProvider';
import { useLibraryInfo } from '@/components/library/LibraryInfoProvider';
import { api, type Membership } from '@/lib/api';
import { hasActiveMembership } from '@/lib/hasActiveMembership';
import { seatMapPlanIdForMarketingPlan } from '@/lib/marketingPlanSeatPreview';
import { membershipPlansFromLibrary, type MembershipPlanOption } from '@/lib/membershipPlans';
import { MembershipBuyPlanForm } from '@/components/membership/MembershipBuyPlanForm';

function normalizeIntent(v: string | string[] | undefined): 'buy' | 'renew' {
  const s = Array.isArray(v) ? v[0] : v;
  return s === 'renew' ? 'renew' : 'buy';
}

export default function MembershipPlansScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const lib = useLibraryInfo();
  const planOptions = useMemo(() => membershipPlansFromLibrary(lib), [lib]);
  const { auth } = useAuth();
  const mp = useMemberPrefetch();
  const params = useLocalSearchParams<{ intent?: string | string[]; planId?: string | string[] }>();
  const intent = normalizeIntent(params.intent);
  const planIdFromRoute = Array.isArray(params.planId) ? params.planId[0] : params.planId;

  const token = auth.status === 'signed_in' ? auth.token : null;
  const isStudent = auth.status === 'signed_in' && auth.user.role === 'student';

  const [current, setCurrent] = useState<Membership | null>(null);
  const [loadingNonStudentRenew, setLoadingNonStudentRenew] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quickRenewing, setQuickRenewing] = useState(false);

  const loadingRenewSection = intent === 'renew' && (isStudent ? mp.loading : loadingNonStudentRenew);

  useEffect(() => {
    if (intent !== 'renew') {
      setLoadingNonStudentRenew(false);
      return;
    }
    if (!token || isStudent) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoadingNonStudentRenew(true);
        const m = await api.membership(token);
        if (cancelled) return;
        setCurrent(m);
        if (m.planMarketingId) setSelectedId(m.planMarketingId);
        else {
          const name = (m.planName ?? '').toLowerCase();
          if (name.includes('row') || name.includes('short')) setSelectedId('row-hall');
          else if (name.includes('main') || name.includes('long')) setSelectedId('main-hall');
        }
      } finally {
        if (!cancelled) setLoadingNonStudentRenew(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, intent, isStudent]);

  useEffect(() => {
    if (!token || intent !== 'renew' || !isStudent) return;
    if (mp.loading) return;
    const m = mp.membership;
    setCurrent(m);
    if (m?.planMarketingId) setSelectedId(m.planMarketingId);
    else if (m) {
      const name = (m.planName ?? '').toLowerCase();
      if (name.includes('row') || name.includes('short')) setSelectedId('row-hall');
      else if (name.includes('main') || name.includes('long')) setSelectedId('main-hall');
    }
  }, [token, intent, isStudent, mp.loading, mp.membership]);

  const title = intent === 'renew' ? 'Renew membership' : 'Buy membership';
  const subtitle =
    intent === 'renew'
      ? 'Extend your membership or pick a different plan, then choose a seat.'
      : 'Choose your hall, how long you want to stay, and the day you’d like to begin.';

  const onQuickRenew = useCallback(async () => {
    if (!token) return;
    setQuickRenewing(true);
    try {
      const res = await api.renewMembership(token);
      if (res.paymentUrl) {
        await Linking.openURL(res.paymentUrl);
        return;
      }
      void mp.refetch();
      router.replace('/(student)/membership');
    } finally {
      setQuickRenewing(false);
    }
  }, [token, mp.refetch]);

  const selectionValid = selectedId != null;

  const gotoSeatMap = () => {
    if (!selectedId || !selectionValid) return;
    router.push({
      pathname: '/(student)/membership/seat-map',
      params: { planId: selectedId, intent },
    });
  };

  const buyBlocked =
    intent === 'buy' && isStudent && !mp.loading && hasActiveMembership(mp.membership);

  if (intent === 'buy' && buyBlocked) {
    const previewPlanId = seatMapPlanIdForMarketingPlan(planIdFromRoute ?? mp.membership?.planMarketingId ?? 'main-hall');
    return (
      <Screen title="Your membership is active" subtitle="Browse the live seat map — checkout stays hidden." scrollable>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backRow, pressed && { opacity: 0.7 }]}>
          <FontAwesome name="angle-left" size={18} color={c.ink700} />
          <Text style={[styles.backText, { color: c.azure600 }]}>Back</Text>
        </Pressable>
        <Button
          title="View available seats"
          onPress={() =>
            router.replace({
              pathname: '/(student)/membership/seat-map',
              params: { planId: previewPlanId, preview: '1' },
            })
          }
        />
        <Button title="My membership" variant="secondary" onPress={() => router.replace('/(student)/membership')} />
      </Screen>
    );
  }

  if (intent === 'buy') {
    const initialDailyHours = planIdFromRoute === 'row-hall' ? 6 : 12;

    return (
      <Screen title={title} subtitle={subtitle} scrollable>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backRow, pressed && { opacity: 0.7 }]}>
          <FontAwesome name="angle-left" size={18} color={c.ink700} />
          <Text style={[styles.backText, { color: c.azure600 }]}>Back to overview</Text>
        </Pressable>

        <MembershipBuyPlanForm
          key={planIdFromRoute ?? 'buy-default'}
          c={c}
          token={token}
          initialDailyHours={initialDailyHours}
          initialMonths={1}
          continueTitle="Continue · pick seat"
          onContinue={({ planId, planKind, durationKey, membershipStartDate }) => {
            router.push({
              pathname: '/(student)/membership/seat-map',
              params: { planId, planKind, durationKey, membershipStartDate, intent: 'buy' },
            });
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen title={title} subtitle={subtitle} scrollable>
      <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backRow, pressed && { opacity: 0.7 }]}>
        <FontAwesome name="angle-left" size={18} color={c.ink700} />
        <Text style={[styles.backText, { color: c.azure600 }]}>Back to overview</Text>
      </Pressable>

      <Card style={{ padding: 16, marginBottom: 12, gap: 10 }}>
        <Text style={[styles.sectionKicker, { color: c.ink500 }]}>Current subscription</Text>
        {loadingRenewSection ? (
          <ActivityIndicator />
        ) : current && current.status !== 'none' ? (
          <>
            <Text style={[styles.planHeadline, { color: c.ink900 }]}>{current.planName ?? 'Your plan'}</Text>
            <Text style={[textStyles.body, { color: c.ink600 }]}>
              Expires {current.expiresAt ? new Date(current.expiresAt).toLocaleDateString() : '—'} ·{' '}
              {current.daysLeft != null ? `${current.daysLeft} days left` : 'Days left pending'}
            </Text>
            {current.renewPlanEligible ? (
              <>
                <Button
                  title={quickRenewing ? 'Opening payment…' : 'Quick renew (same plan)'}
                  variant="secondary"
                  disabled={!token || quickRenewing}
                  onPress={onQuickRenew}
                />
                <Text style={[textStyles.body, { color: c.ink500, fontSize: 12 }]}>
                  If a payment page opens in your browser, complete it there to finish renewing.
                </Text>
              </>
            ) : null}
          </>
        ) : (
          <Text style={[textStyles.body, { color: c.ink600 }]}>No active plan loaded—scroll down to purchase.</Text>
        )}
      </Card>

      <Text style={[styles.sectionKicker, { color: c.ink500, marginBottom: 10 }]}>Change plan (optional)</Text>

      <View style={{ gap: 10 }}>
        {planOptions.map((plan) => (
          <PlanRow key={plan.id} plan={plan} selected={selectedId === plan.id} onPress={() => setSelectedId(plan.id)} c={c} />
        ))}
      </View>

      <View style={{ marginTop: 20, gap: 10 }}>
        <Button title="Continue to seat map" disabled={!selectionValid} onPress={gotoSeatMap} />
        <Text style={[textStyles.body, { color: c.ink500, lineHeight: 17 }]}>
          Changing plan counts as a fresh seat assignment in this flow—we show the desk map next.
        </Text>
      </View>
    </Screen>
  );
}

function PlanRow({
  plan,
  selected,
  onPress,
  c,
}: {
  plan: MembershipPlanOption;
  selected: boolean;
  onPress: () => void;
  c: typeof Colors.light;
}) {
  return (
    <Pressable onPress={onPress}>
      <Card
        style={{
          ...styles.planCard,
          borderColor: selected ? c.azure400 : c.border,
          backgroundColor: selected ? c.azure50 : c.surface,
        }}
      >
        <View style={styles.planTop}>
          <View style={[styles.radio, { borderColor: selected ? c.azure500 : c.borderStrong }]}>
            {selected ? <View style={[styles.radioFill, { backgroundColor: c.azure500 }]} /> : null}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.planTitle, { color: c.ink900 }]}>{plan.title}</Text>
            <Text style={[styles.planSub, { color: c.ink600 }]}>{plan.subtitle}</Text>
            <Text style={[styles.planPrice, { color: c.azure700 }]}>{plan.priceLabel}</Text>
          </View>
        </View>
        {plan.bullets.map((b) => (
          <Text key={b} style={[styles.bulletLine, { color: c.ink600 }]}>
            · {b}
          </Text>
        ))}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginBottom: 14,
    paddingVertical: 4,
  },
  backText: { fontSize: 14, fontWeight: '600' },
  sectionKicker: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  planHeadline: { fontSize: 18, fontWeight: '700' },
  planCard: { padding: 16, gap: 6, borderWidth: 2, borderRadius: 16 },
  planTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioFill: { width: 12, height: 12, borderRadius: 6 },
  planTitle: { fontSize: 16, fontWeight: '700' },
  planSub: { fontSize: 13, marginTop: 4, fontWeight: '500' },
  planPrice: { fontSize: 12, marginTop: 6, fontWeight: '700' },
  bulletLine: { fontSize: 13, marginLeft: 34, marginTop: 4, fontWeight: '500', lineHeight: 18 },
});

import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useAuth } from '@/components/auth/AuthProvider';
import { useMemberPrefetch } from '@/components/member/MemberPrefetchProvider';
import { useLibraryInfo } from '@/components/library/LibraryInfoProvider';
import { MembershipSeatMapIntro } from '@/components/membership/MembershipSeatMapIntro';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { LibrarySeatMap } from '@/components/join/LibrarySeatMap';
import { LibrarySeatMapRows } from '@/components/join/LibrarySeatMapRows';
import { MEMBERSHIP_SEAT_LAYOUT_MODE } from '@/constants/seatLayoutMode';
import { api } from '@/lib/api';
import { hasActiveMembership } from '@/lib/hasActiveMembership';
import { seatMapPlanIdForMarketingPlan } from '@/lib/marketingPlanSeatPreview';
import { planById, planUsesFullDaySeatMap } from '@/lib/membershipPlans';

function normalizeParam(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default function MembershipSeatMapScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const { auth } = useAuth();
  const lib = useLibraryInfo();
  const token = auth.status === 'signed_in' ? auth.token : null;
  const mp = useMemberPrefetch();
  const params = useLocalSearchParams<{
    planId?: string | string[];
    intent?: string | string[];
    planKind?: string | string[];
    durationKey?: string | string[];
    membershipStartDate?: string | string[];
    preview?: string | string[];
  }>();
  const planIdRaw = normalizeParam(params.planId);
  const planId = planIdRaw ? seatMapPlanIdForMarketingPlan(planIdRaw) : undefined;
  const intent = normalizeParam(params.intent) === 'renew' ? 'renew' : 'buy';
  const previewParam = normalizeParam(params.preview) === '1';
  const memberActive =
    auth.status === 'signed_in' &&
    auth.user.role === 'student' &&
    mp.accountReady &&
    hasActiveMembership(mp.membership);
  const previewOnly = previewParam || memberActive;
  const planKindParam = normalizeParam(params.planKind);
  const durationKey = normalizeParam(params.durationKey);
  const membershipStartDate = normalizeParam(params.membershipStartDate);
  const hubCheckout =
    intent === 'buy' &&
    (planKindParam === 'short_term' || planKindParam === 'long_term') &&
    !!durationKey &&
    !!membershipStartDate;

  const plan = planId ? planById(lib, planId) : undefined;
  const [selected, setSelected] = useState<number | null>(null);
  const [occupied, setOccupied] = useState<Set<number>>(new Set());

  /** Rows (S…) for half‑day / hour bundles; Mani (F1–F100) for full‑day plans. */
  const useRowsLayout = planId
    ? !planUsesFullDaySeatMap(planId)
    : MEMBERSHIP_SEAT_LAYOUT_MODE === 'rows';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        if (!cancelled) setOccupied(new Set());
        return;
      }
      const planKind = useRowsLayout ? 'short_term' : 'long_term';
      try {
        const seats = await api.seatOccupancy(token, planKind, {
          startDate: hubCheckout ? membershipStartDate : undefined,
          durationKey: hubCheckout ? durationKey : undefined,
        });
        if (!cancelled) setOccupied(new Set(seats));
      } catch {
        if (!cancelled) setOccupied(new Set());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, useRowsLayout, hubCheckout, membershipStartDate, durationKey]);

  const subtitleParts = useMemo(() => {
    const parts: string[] = [];
    if (intent === 'renew') parts.push('Renewal');
    else parts.push('New membership');
    if (plan?.title) parts.push(plan.title);
    if (useRowsLayout) parts.push('Row hall');
    else parts.push('Main hall');
    if (hubCheckout && membershipStartDate) {
      parts.push(`Starts ${membershipStartDate}`);
    }
    if (previewOnly) parts.push('Payment hidden while your plan is active');
    else if (!token) parts.push('Sign in to see which seats are free');
    else parts.push('Taken seats are greyed out');
    return parts;
  }, [intent, plan?.title, useRowsLayout, hubCheckout, membershipStartDate, token, previewOnly]);

  const seatCode = (id: number) => (useRowsLayout ? `S${id}` : `F${id}`);

  function onConfirm() {
    if (selected == null || !planId) return;
    if (hubCheckout && planKindParam && durationKey && membershipStartDate) {
      router.push({
        pathname: '/(student)/profile/doc',
        params: {
          afterSeat: '1',
          membershipCheckout: '1',
          planId,
          planKind: planKindParam,
          durationKey,
          membershipStartDate,
          seatNumber: String(selected),
          seatCode: seatCode(selected),
          intent: 'buy',
        },
      });
      return;
    }
    router.push({
      pathname: '/(student)/profile/doc',
      params: {
        afterSeat: '1',
        planId,
        intent,
        seatCode: seatCode(selected),
      },
    });
  }

  return (
    <Screen
      title={previewOnly ? 'Available seats' : 'Pick your seat'}
      subtitle={subtitleParts.join(' · ')}
      scrollable
    >
      {!plan ? (
        <Text style={[styles.warn, { color: c.azure700 }]}>
          Go back and choose a plan to see the seat map.
        </Text>
      ) : null}

      {plan ? <MembershipSeatMapIntro /> : null}

      {useRowsLayout ? (
        <LibrarySeatMapRows
          occupiedSeatIds={occupied}
          selectedSeatId={selected}
          onSelectSeat={setSelected}
          interactive
        />
      ) : (
        <LibrarySeatMap
          occupiedSeatIds={occupied}
          selectedSeatId={selected}
          onSelectSeat={setSelected}
          interactive
        />
      )}

      <View style={[styles.ticket, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={styles.ticketLeft}>
          <MaterialCommunityIcons name="desk" size={18} color={c.azure600} />
          <Text style={[styles.ticketTitle, { color: c.ink700 }]}>Desk location</Text>
        </View>
        <View style={[styles.ticketChip, { borderColor: selected ? c.azure500 : c.borderStrong, backgroundColor: selected ? c.azure50 : c.surfaceMuted }]}>
          <Text style={[styles.ticketChipCode, { color: selected ? c.ink900 : c.ink500 }]}>
            {selected != null ? seatCode(selected) : '—'}
          </Text>
        </View>
      </View>

      <Text style={[styles.pick, { color: selected ? c.ink700 : c.ink500 }]}>
        {previewOnly
          ? selected
            ? 'Tap seats to see numbers. Occupied seats reflect current bookings.'
            : useRowsLayout
              ? 'Row hall (S codes). Empty desks have a light blue outline.'
              : 'Main hall (F1–F100). Empty desks have a light blue outline.'
          : selected
            ? hubCheckout
              ? 'Seat selected. Next, upload your documents, then review your total and pay.'
              : 'Seat selected — next you will upload Aadhaar and student ID so we can verify you.'
            : useRowsLayout
              ? 'Short‑term map (S codes). Tap an available desk.'
              : 'Full‑day map (F1–F100). Tap an available desk.'}
      </Text>

      <View style={styles.footer}>
        <Button title="Back" variant="secondary" onPress={() => router.back()} />
        {previewOnly ? (
          <Button title="My membership" onPress={() => router.replace('/(student)/membership')} />
        ) : (
          <Button
            title={hubCheckout ? 'Continue · upload documents' : 'Confirm seat & verify ID'}
            disabled={!plan || selected == null}
            onPress={onConfirm}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  warn: { marginBottom: 12, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  pick: { marginTop: 16, marginBottom: 8, fontSize: 14, fontWeight: '500', lineHeight: 20 },
  ticket: {
    marginTop: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  ticketLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ticketTitle: { fontSize: 14, fontWeight: '800' },
  ticketChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    justifyContent: 'center',
    minWidth: 56,
    alignItems: 'center',
  },
  ticketChipCode: { fontSize: 16, fontWeight: '900' },
  footer: { flexDirection: 'row', gap: 12, marginTop: 8, flexWrap: 'wrap' },
});

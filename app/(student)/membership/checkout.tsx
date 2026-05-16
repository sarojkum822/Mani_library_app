import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, useLocalSearchParams } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Button } from '@/components/ui/Button';
import { Screen, textStyles } from '@/components/ui/Screen';
import { useAuth } from '@/components/auth/AuthProvider';
import { useMemberPrefetch } from '@/components/member/MemberPrefetchProvider';
import { invalidateWarmMemberCore } from '@/components/member/memberPrefetchWarm';
import { api, invalidateMemberAccountCache, type MemberProfile } from '@/lib/api';
import { hasActiveMembership } from '@/lib/hasActiveMembership';
import { seatMapPlanIdForMarketingPlan } from '@/lib/marketingPlanSeatPreview';
import { membershipInclusiveEndYmd } from '@/lib/membershipHubDates';
import {
  calendarMonthsFromDurationKey,
  computeOrderAmountRupees,
  LONG_TERM_DURATION_OPTIONS,
  planTitle,
  SHORT_TERM_DURATION_OPTIONS,
  type MembershipPlanKind,
} from '@/lib/membershipPricing';
import { MEMBERSHIP_SEAT_LAYOUT_MODE } from '@/constants/seatLayoutMode';
import { planUsesFullDaySeatMap } from '@/lib/membershipPlans';
import { openRazorpayCheckout } from '@/lib/razorpayNative';
import { formatPhoneForRazorpayPrefill } from '@/lib/razorpayPrefill';
import { sanitizeAadhaarLastFourInput, sanitizeRollNumberDigitsInput } from '@/lib/intakeFieldLimits';
import { MEMBERSHIP_INSTITUTION_VALUES } from '@/lib/membershipInstitutionOptions';

function normalizeParam(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function isPlanKind(v: string | undefined): v is MembershipPlanKind {
  return v === 'short_term' || v === 'long_term';
}

/** Intake collected on the verify screen; applied to the profile only after payment succeeds. */
function pendingIntakeFromParams(params: {
  intakeLast4?: string | string[];
  intakeRoll?: string | string[];
  intakeInstitution?: string | string[];
  intakePreparing?: string | string[];
}): {
  aadhaar_last_four: string;
  student_roll_number: string | null;
  institution_type: string;
  preparing_for: string | null;
} | null {
  const last4 = sanitizeAadhaarLastFourInput(normalizeParam(params.intakeLast4) ?? '');
  const institution = (normalizeParam(params.intakeInstitution) ?? '').trim();
  if (!/^\d{4}$/.test(last4) || !MEMBERSHIP_INSTITUTION_VALUES.has(institution)) return null;
  const roll = sanitizeRollNumberDigitsInput(normalizeParam(params.intakeRoll) ?? '');
  const preparing = (normalizeParam(params.intakePreparing) ?? '').trim();
  return {
    aadhaar_last_four: last4,
    student_roll_number: roll || null,
    institution_type: institution,
    preparing_for: preparing || null,
  };
}

function seatCodeFrom(planId: string | undefined, seatNum: number): string {
  const rows = planId ? !planUsesFullDaySeatMap(planId) : MEMBERSHIP_SEAT_LAYOUT_MODE === 'rows';
  return rows ? `S${seatNum}` : `F${seatNum}`;
}

export default function MembershipCheckoutScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const { auth } = useAuth();
  const mp = useMemberPrefetch();
  const token = auth.status === 'signed_in' ? auth.token : null;
  const user = auth.status === 'signed_in' ? auth.user : null;

  const params = useLocalSearchParams<{
    planId?: string | string[];
    planKind?: string | string[];
    durationKey?: string | string[];
    membershipStartDate?: string | string[];
    seatNumber?: string | string[];
    intakeLast4?: string | string[];
    intakeRoll?: string | string[];
    intakeInstitution?: string | string[];
    intakePreparing?: string | string[];
  }>();

  const planId = normalizeParam(params.planId);
  const planKindRaw = normalizeParam(params.planKind);
  const planKind = isPlanKind(planKindRaw) ? planKindRaw : null;
  const durationKey = normalizeParam(params.durationKey);
  const membershipStartDate = normalizeParam(params.membershipStartDate);
  const seatRaw = normalizeParam(params.seatNumber);
  const seatNumber = seatRaw != null && seatRaw !== '' ? Math.round(Number(seatRaw)) : NaN;

  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) return;
      try {
        const p = await api.memberProfile(token);
        if (!cancelled) setProfile(p);
      } catch {
        if (!cancelled) setProfile(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const durationLabel = useMemo(() => {
    if (!durationKey || !planKind) return '—';
    const list = planKind === 'short_term' ? SHORT_TERM_DURATION_OPTIONS : LONG_TERM_DURATION_OPTIONS;
    return list.find((o) => o.key === durationKey)?.label ?? durationKey;
  }, [durationKey, planKind]);

  const totalRupees = useMemo(() => {
    if (!planKind || !durationKey) return 0;
    return computeOrderAmountRupees(planKind, durationKey) ?? 0;
  }, [durationKey, planKind]);

  const seatLabel = planKind && Number.isFinite(seatNumber) ? seatCodeFrom(planId, seatNumber) : '—';

  const paramsOk =
    token &&
    user &&
    planKind &&
    durationKey &&
    membershipStartDate &&
    Number.isFinite(seatNumber) &&
    seatNumber > 0;

  const pay = async () => {
    if (!token || !user || !planKind || !durationKey || !membershipStartDate || !Number.isFinite(seatNumber)) return;
    setErr(null);
    setBusy(true);
    let paymentId: string | null = null;
    try {
      const order = await api.createRazorpayMembershipOrder(token, {
        planKind,
        seatNumber,
        membershipStartDate,
        durationKey,
      });
      paymentId = order.paymentId;

      const prefillEmail = user.email ?? profile?.email;
      const prefillContact =
        formatPhoneForRazorpayPrefill(profile?.phone) ?? formatPhoneForRazorpayPrefill(user.phone);

      const checkoutOptions: Record<string, unknown> = {
        description: `${planTitle(planKind, durationLabel)} · seat ${seatLabel}`,
        currency: order.currency,
        key: order.keyId,
        amount: String(order.amount),
        name: 'Mani Library',
        order_id: order.orderId,
        theme: { color: '#0ea5e9' },
        prefill: {
          name: profile?.name ?? user.name ?? 'Member',
          ...(prefillEmail ? { email: prefillEmail } : {}),
          ...(prefillContact ? { contact: prefillContact } : {}),
        },
      };
      if (prefillEmail && prefillContact) {
        checkoutOptions.method = 'card';
      }

      const resp = await openRazorpayCheckout(checkoutOptions);

      try {
        await api.verifyRazorpayPayment(token, {
          razorpay_order_id: resp.razorpay_order_id,
          razorpay_payment_id: resp.razorpay_payment_id,
          razorpay_signature: resp.razorpay_signature,
          payment_id: order.paymentId,
        });
      } catch (verifyErr) {
        if (resp.razorpay_payment_id?.startsWith('pay_')) {
          await api.reconcileRazorpayPayment(token, resp.razorpay_payment_id);
        } else {
          throw verifyErr;
        }
      }

      let intakeWarning = false;
      const pendingIntake = pendingIntakeFromParams(params);
      if (pendingIntake) {
        try {
          await api.updateProfileIntake(token, pendingIntake);
        } catch {
          intakeWarning = true;
        }
      }

      invalidateMemberAccountCache();
      invalidateWarmMemberCore();
      await mp.refetch();

      const calendarMonths = calendarMonthsFromDurationKey(durationKey) ?? 1;
      const membershipEndDate = membershipInclusiveEndYmd(membershipStartDate, calendarMonths);
      const title = planTitle(planKind, durationLabel);

      router.replace({
        pathname: '/(student)/membership/payment-success',
        params: {
          planTitle: title,
          seatLabel,
          membershipStartDate,
          membershipEndDate,
          totalRupees: String(totalRupees),
          ...(intakeWarning ? { intakeWarning: '1' } : {}),
        },
      });
    } catch (e) {
      const description = e instanceof Error ? e.message : 'Checkout failed.';
      if (paymentId) {
        void api.abandonRazorpayCheckout(token, paymentId).catch(() => {});
      }
      setErr(description);
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <Screen title="Payment" subtitle="Sign in to pay for your membership." scrollable>
        <Button title="Sign in" onPress={() => router.replace('/(auth)/login')} />
      </Screen>
    );
  }

  if (mp.accountReady && hasActiveMembership(mp.membership)) {
    const previewPlanId = seatMapPlanIdForMarketingPlan(mp.membership?.planMarketingId ?? planId ?? 'main-hall');
    return (
      <Screen title="Payment unavailable" subtitle="Your current plan is still active." scrollable>
        <Text style={[textStyles.body, { color: c.ink600, lineHeight: 20 }]}>
          You can browse seats on the hall map. Checkout opens again after your membership ends or an admin closes it.
        </Text>
        <View style={{ marginTop: 16, gap: 10 }}>
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
        </View>
      </Screen>
    );
  }

  if (!paramsOk) {
    return (
      <Screen title="Payment" subtitle="Something is missing from your booking." scrollable>
        <Text style={[textStyles.body, { color: c.azure700 }]}>
          Please start again from Buy membership and go through each step in order.
        </Text>
        <View style={{ marginTop: 16, gap: 10 }}>
          <Button title="Buy membership" onPress={() => router.replace('/(student)/membership/plans?intent=buy')} />
          <Button title="Seat map" variant="secondary" onPress={() => router.replace('/(student)/membership/seat-map')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen title="Payment" subtitle="Check your total, then complete payment." scrollable>
      <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backRow, pressed && { opacity: 0.7 }]}>
        <FontAwesome name="angle-left" size={18} color={c.ink700} />
        <Text style={[styles.backText, { color: c.azure600 }]}>Back</Text>
      </Pressable>

      <View style={[styles.card, { borderColor: c.border, backgroundColor: c.surfaceMuted }]}>
        <Text style={[styles.kicker, { color: c.ink500 }]}>Summary</Text>
        <Text style={[styles.line, { color: c.ink900 }]}>{planTitle(planKind!, durationLabel)}</Text>
        <Text style={[styles.meta, { color: c.ink600 }]}>Seat {seatLabel}</Text>
        <Text style={[styles.meta, { color: c.ink600 }]}>Starts {membershipStartDate}</Text>
        <Text style={[styles.total, { color: c.ink900 }]}>₹{totalRupees.toLocaleString('en-IN')}</Text>
      </View>

      {err ? <Text style={[styles.err, { color: c.azure700 }]}>{err}</Text> : null}

      <View style={{ marginTop: 20, gap: 12 }}>
        <Button title={busy ? 'Opening payment…' : 'Pay now'} disabled={busy} onPress={pay} />
      </View>
    </Screen>
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
  kicker: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  card: { padding: 16, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, gap: 8 },
  line: { fontSize: 17, fontWeight: '700', marginTop: 4 },
  meta: { fontSize: 14, fontWeight: '500' },
  total: { fontSize: 22, fontWeight: '800', marginTop: 8, fontVariant: ['tabular-nums'] },
  err: { marginTop: 14, fontSize: 14, fontWeight: '600' },
});

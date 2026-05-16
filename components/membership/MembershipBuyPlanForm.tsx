import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { Button } from '@/components/ui/Button';
import { MembershipStartDateCalendar } from '@/components/membership/MembershipStartDateCalendar';
import { textStyles } from '@/components/ui/Screen';
import {
  addCalendarDaysYmd,
  isOnOrAfterYmd,
  MAX_ADVANCE_BOOKING_DAYS,
  todayYmdInLibraryTz,
} from '@/lib/membershipHubDates';
import {
  computeOrderAmountRupees,
  LONG_TERM_DURATION_OPTIONS,
  SHORT_TERM_DURATION_OPTIONS,
  longTermKeyForHubMonths,
  shortHubKeyForMonths,
  type MembershipPlanKind,
} from '@/lib/membershipPricing';

export type MembershipBuyPlanPayload = {
  planId: string;
  planKind: MembershipPlanKind;
  durationKey: string;
  membershipStartDate: string;
};

type DailyHours = 12 | 6;
type MonthChoice = 1 | 3 | 6;

function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
  c,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  c: (typeof Colors)['light'];
}) {
  return (
    <View style={styles.segWrap}>
      <Text style={[styles.segLabel, { color: c.ink500 }]}>{label}</Text>
      <View style={[styles.segRow, { backgroundColor: c.ink100 }]}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <Pressable
              key={String(o.value)}
              onPress={() => onChange(o.value)}
              style={[styles.segBtn, active && { backgroundColor: c.surface, shadowOpacity: 0.08 }]}
            >
              <Text style={[styles.segBtnText, { color: active ? c.ink900 : c.ink500 }]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

type Props = {
  c: (typeof Colors)['light'];
  token: string | null;
  onContinue: (payload: MembershipBuyPlanPayload) => void;
  continueTitle?: string;
  /** Optional short note under the primary button (keep user-facing). */
  footerHint?: string;
  /** Preselect hall when user chose a plan card. */
  initialDailyHours?: DailyHours;
  /** Preselect duration when user chose a plan card. */
  initialMonths?: MonthChoice;
};

export function MembershipBuyPlanForm({
  c,
  token,
  onContinue,
  continueTitle = 'Continue · pick seat',
  footerHint,
  initialDailyHours,
  initialMonths,
}: Props) {
  const today = useMemo(() => todayYmdInLibraryTz(), []);
  const maxStart = useMemo(() => addCalendarDaysYmd(today, MAX_ADVANCE_BOOKING_DAYS), [today]);

  const [dailyHours, setDailyHours] = useState<DailyHours>(initialDailyHours ?? 12);
  const [months, setMonths] = useState<MonthChoice>(initialMonths ?? 1);
  const [membershipStartDate, setMembershipStartDate] = useState(today);

  const planKind: MembershipPlanKind = dailyHours === 12 ? 'long_term' : 'short_term';
  const durationKey = planKind === 'long_term' ? longTermKeyForHubMonths(months) : shortHubKeyForMonths(months);
  const planId = planKind === 'long_term' ? 'main-hall' : 'row-hall';

  const durationLabel = useMemo(() => {
    const list = planKind === 'short_term' ? SHORT_TERM_DURATION_OPTIONS : LONG_TERM_DURATION_OPTIONS;
    return list.find((o) => o.key === durationKey)?.label ?? durationKey;
  }, [durationKey, planKind]);

  const totalRupees = useMemo(() => computeOrderAmountRupees(planKind, durationKey) ?? 0, [durationKey, planKind]);

  const dateErr = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(membershipStartDate)) return 'Use YYYY-MM-DD.';
    if (!isOnOrAfterYmd(membershipStartDate, today)) return `Start on or after ${today} (library time).`;
    if (membershipStartDate > maxStart) return `Start at most ${MAX_ADVANCE_BOOKING_DAYS} days ahead.`;
    return null;
  }, [maxStart, membershipStartDate, today]);

  const hallTitle = dailyHours === 12 ? 'Main hall · 12 hrs/day' : 'Row hall · 6 hrs/day';

  const submit = () => {
    if (dateErr || !token) return;
    onContinue({ planId, planKind, durationKey, membershipStartDate });
  };

  return (
    <>
      {!token ? (
        <Text style={[textStyles.body, { color: c.azure700 }]}>Sign in to choose your seat and finish joining.</Text>
      ) : null}

      <Text style={[styles.kicker, { color: c.ink500 }]}>Your plan</Text>
      <Text style={[styles.h1, { color: c.ink900 }]}>{hallTitle}</Text>
      <Text style={[textStyles.body, { color: c.ink600, marginTop: 6 }]}>
        {dailyHours === 12
          ? 'A desk in the main study hall, billed month by month.'
          : 'A seat in the row hall, with a 6-hour study pass each day.'}
      </Text>

      <View style={{ marginTop: 20, gap: 18 }}>
        <Segmented<DailyHours>
          label="Hall"
          c={c}
          value={dailyHours}
          onChange={setDailyHours}
          options={[
            { value: 12, label: 'Main' },
            { value: 6, label: 'Row' },
          ]}
        />
        <Segmented<MonthChoice>
          label="Duration"
          c={c}
          value={months}
          onChange={setMonths}
          options={[
            { value: 1, label: '1 mo' },
            { value: 3, label: '3 mo' },
            { value: 6, label: '6 mo' },
          ]}
        />
      </View>

      <View style={{ marginTop: 22 }}>
        <Text style={[styles.kicker, { color: c.ink500 }]}>Membership starts</Text>
        <MembershipStartDateCalendar
          value={membershipStartDate}
          minYmd={today}
          maxYmd={maxStart}
          calendarMonths={months}
          onChange={setMembershipStartDate}
          c={c}
        />
        {dateErr ? <Text style={[styles.dateErr, { color: c.azure700 }]}>{dateErr}</Text> : null}
      </View>

      <View style={[styles.totalCard, { borderColor: c.border, backgroundColor: c.surfaceMuted }]}>
        <Text style={[styles.kicker, { color: c.ink500 }]}>Total</Text>
        <Text style={[styles.totalAmt, { color: c.ink900 }]}>₹{totalRupees.toLocaleString('en-IN')}</Text>
        <Text style={[styles.totalSub, { color: c.ink600 }]}>{durationLabel}</Text>
      </View>

      <View style={{ marginTop: 24, gap: 10 }}>
        <Button title={continueTitle} disabled={!token || !!dateErr} onPress={submit} />
        {footerHint ? (
          <Text style={[textStyles.body, { color: c.ink500, fontSize: 12, lineHeight: 18 }]}>{footerHint}</Text>
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  kicker: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  h1: { marginTop: 6, fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  segWrap: { gap: 8 },
  segLabel: { fontSize: 13, fontWeight: '600' },
  segRow: { flexDirection: 'row', borderRadius: 12, padding: 4, gap: 4 },
  segBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  segBtnText: { fontSize: 13, fontWeight: '700' },
  dateErr: { marginTop: 8, fontSize: 13, fontWeight: '500' },
  totalCard: { marginTop: 20, padding: 16, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, gap: 6 },
  totalAmt: { fontSize: 26, fontWeight: '800', fontVariant: ['tabular-nums'] },
  totalSub: { fontSize: 13, fontWeight: '500' },
});

import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, useLocalSearchParams } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen, textStyles } from '@/components/ui/Screen';
import { formatYmdLong, formatYmdShort, isOnOrAfterYmd, todayYmdInLibraryTz } from '@/lib/membershipHubDates';

function normalizeParam(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function SummaryRow({ label, value, c }: { label: string; value: string; c: typeof Colors.light }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, { color: c.ink500 }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: c.ink900 }]}>{value}</Text>
    </View>
  );
}

export default function MembershipPaymentSuccessScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  const params = useLocalSearchParams<{
    planTitle?: string | string[];
    seatLabel?: string | string[];
    membershipStartDate?: string | string[];
    membershipEndDate?: string | string[];
    totalRupees?: string | string[];
    intakeWarning?: string | string[];
  }>();

  const planTitleText = normalizeParam(params.planTitle) ?? 'Your membership';
  const seatLabel = normalizeParam(params.seatLabel) ?? '—';
  const startYmd = normalizeParam(params.membershipStartDate) ?? '';
  const endYmd = normalizeParam(params.membershipEndDate) ?? '';
  const totalRaw = normalizeParam(params.totalRupees);
  const totalRupees = totalRaw != null && totalRaw !== '' ? Number(totalRaw) : NaN;
  const intakeWarning = normalizeParam(params.intakeWarning) === '1';

  const today = useMemo(() => todayYmdInLibraryTz(), []);
  const startsInFuture = startYmd.length > 0 && isOnOrAfterYmd(startYmd, today) && startYmd > today;

  const periodLabel =
    startYmd && endYmd
      ? `${formatYmdShort(startYmd)} → ${formatYmdShort(endYmd)}`
      : startYmd
        ? formatYmdLong(startYmd)
        : '—';

  return (
    <Screen title="Payment received" subtitle="Your membership is confirmed." scrollable>
      <View style={styles.hero}>
        <View style={[styles.iconWrap, { backgroundColor: c.azure50, borderColor: c.azure200 }]}>
          <FontAwesome name="check" size={28} color={c.azure600} />
        </View>
        <Text style={[styles.heroTitle, { color: c.ink900 }]}>Thank you — you're in!</Text>
        <Text style={[styles.heroSub, { color: c.ink600 }]}>
          {startsInFuture
            ? 'Payment is recorded. Your seat is reserved — library access begins on your start date.'
            : 'Payment is recorded. Your seat is reserved and your membership is on your account.'}
        </Text>
      </View>

      <Card style={{ padding: 16, gap: 12 }}>
        <Text style={[styles.kicker, { color: c.ink500 }]}>Your booking</Text>
        <SummaryRow label="Plan" value={planTitleText} c={c} />
        <SummaryRow label="Seat" value={seatLabel} c={c} />
        <SummaryRow label="Period" value={periodLabel} c={c} />
        {startsInFuture && startYmd ? (
          <SummaryRow label="Access starts" value={formatYmdLong(startYmd)} c={c} />
        ) : null}
        {Number.isFinite(totalRupees) ? (
          <View style={[styles.totalRow, { borderTopColor: c.ink100 }]}>
            <Text style={[styles.summaryLabel, { color: c.ink500 }]}>Paid</Text>
            <Text style={[styles.totalValue, { color: c.azure700 }]}>
              ₹{totalRupees.toLocaleString('en-IN')}
            </Text>
          </View>
        ) : null}
      </Card>

      {intakeWarning ? (
        <Card style={{ padding: 14, marginTop: 12, backgroundColor: c.azure50, borderColor: c.azure200 }}>
          <Text style={[textStyles.body, { color: c.azure700, lineHeight: 20 }]}>
            We could not save your profile answers just now. You can add them under Profile → Your profile.
          </Text>
        </Card>
      ) : null}

      <View style={{ marginTop: 24, gap: 10 }}>
        <Button title="View membership" onPress={() => router.replace('/(student)/membership')} />
        <Button title="Back to Home" variant="secondary" onPress={() => router.replace('/(student)')} />
      </View>

      <Text style={[styles.footnote, { color: c.ink500 }]}>
        Keep this screen for your records. For desk help, mention your seat {seatLabel}
        {startYmd ? ` and start date ${startYmd}` : ''}.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingTop: 8, paddingBottom: 20, paddingHorizontal: 8 },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    marginTop: 16,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.35,
    textAlign: 'center',
  },
  heroSub: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    textAlign: 'center',
  },
  kicker: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  summaryRow: { gap: 4 },
  summaryLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' },
  summaryValue: { fontSize: 15, fontWeight: '600', lineHeight: 21 },
  totalRow: {
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalValue: { fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
  footnote: { marginTop: 20, fontSize: 12, lineHeight: 18, fontWeight: '500', textAlign: 'center' },
});

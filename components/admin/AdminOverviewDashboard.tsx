import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';

import { cardElevation } from '@/lib/platformStyles';
import Colors from '@/constants/Colors';
import { FONT_SANS } from '@/constants/Fonts';
import { useColorScheme } from '@/components/useColorScheme';
import type { AdminOverviewSnapshot } from '@/lib/api';
import { daysUntil, formatCurrency } from '@/lib/members';
import type { LibraryInfoJson } from '@/lib/libraryInfoTypes';

const AVATAR_TINTS = ['#E0EDFF', '#D1FAE5', '#FCE7F3', '#FEF3C7', '#E0E7FF'];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0] ?? '?').slice(0, 2).toUpperCase();
}

function formatCompactInr(n: number): string {
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(2).replace(/\.?0+$/, '')}L`;
  if (n >= 1_000) return `₹${Math.round(n / 1_000)}k`;
  return `₹${n.toLocaleString('en-IN')}`;
}

function planSeatLine(planKindRaw: string, seatNo: string): string {
  const hall =
    planKindRaw === 'long_term' ? 'Main hall' : planKindRaw === 'short_term' ? 'Row hall' : 'Plan';
  const tier = planKindRaw === 'long_term' ? 'Full day' : planKindRaw === 'short_term' ? 'Short term' : hall;
  return `${tier} · Seat ${seatNo}`;
}

type MonthBucket = { key: string; label: string; amount: number };

function revenueMonthBuckets(days: { day: string; amountInr: number }[]): MonthBucket[] {
  const map = new Map<string, number>();
  for (const d of days) {
    if (!d.day || d.day.length < 7) continue;
    const key = d.day.slice(0, 7);
    map.set(key, (map.get(key) ?? 0) + d.amountInr);
  }
  const keys = [...map.keys()].sort();
  const last = keys.slice(-5);
  return last.map((key) => {
    const [, mm] = key.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const idx = Math.max(0, Number(mm) - 1);
    return { key, label: monthNames[idx] ?? key, amount: map.get(key) ?? 0 };
  });
}

type Props = {
  lib: LibraryInfoJson;
  overview: AdminOverviewSnapshot;
  todayCheckIns: number;
  onOpenPayments: () => void;
  onOpenSubscriptions: () => void;
  onOpenAttendance: () => void;
  onOpenMembers: () => void;
};

export function AdminOverviewDashboard({
  lib,
  overview,
  todayCheckIns,
  onOpenPayments,
  onOpenSubscriptions,
  onOpenAttendance,
  onOpenMembers,
}: Props) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const { stats, expiringSoon, chart } = overview;
  const seatCap = lib.capacity;
  const active = stats.activeTotal;
  const occupancyPct = seatCap > 0 ? Math.round((active / seatCap) * 100) : 0;

  const now = new Date();
  const dateLine = now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  const monthBars = useMemo(() => revenueMonthBuckets(chart.revenueByDay), [chart.revenueByDay]);
  const currentMonthKey = now.toISOString().slice(0, 7);
  const maxBar = Math.max(1, ...monthBars.map((b) => b.amount), stats.revenue30dInr);

  const monthGrowth = useMemo(() => {
    if (monthBars.length < 2) return null;
    const cur = monthBars[monthBars.length - 1]?.amount ?? 0;
    const prev = monthBars[monthBars.length - 2]?.amount ?? 0;
    if (prev <= 0) return null;
    return Math.round(((cur - prev) / prev) * 100);
  }, [monthBars]);

  const expiringTop = useMemo(() => {
    return [...expiringSoon]
      .sort((a, b) => daysUntil(a.expiryDate) - daysUntil(b.expiryDate))
      .slice(0, 3);
  }, [expiringSoon]);

  const alertCount = stats.pendingPayments;

  return (
    <View style={styles.wrap}>
      <View style={styles.dateRow}>
        <Text style={[styles.dateText, { color: c.ink600 }]}>{dateLine}</Text>
        <View style={[styles.livePill, { backgroundColor: c.emerald100 }]}>
          <View style={[styles.liveDot, { backgroundColor: c.emerald700 }]} />
          <Text style={[styles.liveText, { color: c.emerald800 }]}>Live</Text>
        </View>
      </View>

      <View style={styles.statGrid}>
        <MiniStat
          icon="users"
          iconBg={c.azure50}
          iconColor={c.azure600}
          value={String(stats.registeredAccounts || stats.totalMembers)}
          label="Total members"
          trend={stats.newMemberships30d > 0 ? `↑ ${stats.newMemberships30d} this month` : undefined}
          trendColor={c.emerald700}
          onPress={onOpenMembers}
        />
        <MiniStat
          icon="id-card"
          iconBg={c.emerald100}
          iconColor={c.emerald700}
          value={String(stats.activeMembersDistinct ?? active)}
          label="Active now"
          trend={seatCap > 0 ? `${occupancyPct}% occupancy` : undefined}
          trendColor={c.emerald700}
          onPress={onOpenSubscriptions}
        />
        <MiniStat
          icon="calendar-check-o"
          iconBg={c.emerald100}
          iconColor={c.emerald700}
          value={String(todayCheckIns)}
          label="Today's check-ins"
          trend={stats.paidCountToday > 0 ? `${stats.paidCountToday} payments today` : undefined}
          trendColor={c.emerald700}
          onPress={onOpenAttendance}
        />
        <MiniStat
          icon="clock-o"
          iconBg={c.amber100}
          iconColor={c.amber800}
          value={String(expiringSoon.length)}
          label="Expiring soon"
          trend="within 7 days"
          trendColor={c.amber800}
          onPress={onOpenSubscriptions}
        />
      </View>

      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }, cardElevation()]}>
        <View style={styles.cardHead}>
          <Text style={[styles.cardTitle, { color: c.ink900 }]}>Monthly income</Text>
          <Pressable onPress={onOpenPayments} hitSlop={8}>
            <Text style={[styles.link, { color: c.azure600 }]}>Full report ›</Text>
          </Pressable>
        </View>
        <View style={styles.incomeHero}>
          <Text style={[styles.incomeValue, { color: c.ink900 }]}>{formatCurrency(lib, stats.revenue30dInr)}</Text>
          {monthGrowth != null && monthGrowth !== 0 ? (
            <View style={[styles.growthPill, { backgroundColor: c.emerald100 }]}>
              <Text style={[styles.growthText, { color: c.emerald800 }]}>
                {monthGrowth > 0 ? '↑' : '↓'} {Math.abs(monthGrowth)}% vs prior month
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.incomeSub, { color: c.ink500 }]}>
          Last 30 days · {stats.activeMembersDistinct ?? active} active plans
        </Text>
        <View style={styles.bars}>
          {monthBars.length === 0 ? (
            <Text style={[styles.emptyBars, { color: c.ink500 }]}>No paid revenue in chart window yet.</Text>
          ) : (
            monthBars.map((b) => {
              const isCurrent = b.key === currentMonthKey;
              const pct = Math.max(4, Math.round((b.amount / maxBar) * 100));
              return (
                <View key={b.key} style={styles.barRow}>
                  <Text style={[styles.barLabel, { color: c.ink600 }]}>{b.label}</Text>
                  <View style={[styles.barTrack, { backgroundColor: c.ink100 }]}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${pct}%`,
                          backgroundColor: isCurrent ? c.emerald700 : c.azure500,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.barAmount, { color: isCurrent ? c.emerald800 : c.ink700 }]}>
                    {formatCompactInr(b.amount)}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }, cardElevation()]}>
        <View style={styles.cardHead}>
          <Text style={[styles.cardTitle, { color: c.ink900 }]}>Expiring soon</Text>
          <Pressable onPress={onOpenSubscriptions} hitSlop={8}>
            <Text style={[styles.link, { color: c.azure600 }]}>View all ›</Text>
          </Pressable>
        </View>
        {expiringTop.length === 0 ? (
          <Text style={[styles.emptyList, { color: c.ink500 }]}>No renewals due in the next 7 days.</Text>
        ) : (
          expiringTop.map((m, i) => {
            const d = m.expiryDate === '9999-12-31' ? 999 : daysUntil(m.expiryDate);
            const expired = d < 0;
            const badgeLabel = expired ? 'Expired' : d <= 0 ? 'Today' : `${d}d left`;
            const badgeBg = expired ? c.red100 : c.amber100;
            const badgeFg = expired ? c.red700 : c.amber800;
            const tint = AVATAR_TINTS[i % AVATAR_TINTS.length];
            const fg = ['#1D4ED8', '#047857', '#9D174D', '#92400E', '#4338CA'][i % 5];
            return (
              <Pressable
                key={m.id}
                onPress={() => {
                  if (m.userId) router.push(`/(admin)/member/${encodeURIComponent(m.userId)}`);
                  else onOpenSubscriptions();
                }}
                style={[
                  styles.expireRow,
                  i < expiringTop.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
                ]}
              >
                <View style={[styles.expireAvatar, { backgroundColor: tint }]}>
                  <Text style={[styles.expireInitials, { color: fg }]}>{initials(m.name)}</Text>
                </View>
                <View style={styles.expireMeta}>
                  <Text style={[styles.expireName, { color: c.ink900 }]} numberOfLines={1}>
                    {m.name}
                  </Text>
                  <Text style={[styles.expireSub, { color: c.ink500 }]} numberOfLines={1}>
                    {planSeatLine(m.planKindRaw, m.seatNo)}
                  </Text>
                </View>
                <View style={styles.expireRight}>
                  <View style={[styles.expireBadge, { backgroundColor: badgeBg }]}>
                    <Text style={[styles.expireBadgeText, { color: badgeFg }]}>{badgeLabel}</Text>
                  </View>
                  <Text style={[styles.expireDate, { color: c.ink500 }]}>{m.endLabel}</Text>
                </View>
              </Pressable>
            );
          })
        )}
      </View>

      {alertCount > 0 ? (
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }, cardElevation()]}>
          <View style={styles.cardHead}>
            <Text style={[styles.cardTitle, { color: c.ink900 }]}>Alerts</Text>
            <View style={[styles.alertCount, { backgroundColor: c.red100 }]}>
              <Text style={[styles.alertCountText, { color: c.red700 }]}>
                {alertCount} new
              </Text>
            </View>
          </View>
          <Pressable onPress={onOpenPayments} style={styles.alertRow}>
            <Text style={[styles.alertBody, { color: c.ink800 }]}>
              {alertCount} pending checkout{alertCount === 1 ? '' : 's'} — review in Payments
            </Text>
            <FontAwesome name="chevron-right" size={12} color={c.ink400} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function MiniStat({
  icon,
  iconBg,
  iconColor,
  value,
  label,
  trend,
  trendColor,
  onPress,
}: {
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  iconBg: string;
  iconColor: string;
  value: string;
  label: string;
  trend?: string;
  trendColor?: string;
  onPress?: () => void;
}) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.miniCard,
        { backgroundColor: c.surface, borderColor: c.border },
        cardElevation(),
        pressed && { opacity: 0.92 },
      ]}
    >
      <View style={[styles.miniIcon, { backgroundColor: iconBg }]}>
        <FontAwesome name={icon} size={16} color={iconColor} />
      </View>
      <Text style={[styles.miniValue, { color: c.ink900 }]}>{value}</Text>
      <Text style={[styles.miniLabel, { color: c.ink500 }]}>{label}</Text>
      {trend ? <Text style={[styles.miniTrend, { color: trendColor ?? c.emerald700 }]}>{trend}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 16 },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  dateText: { fontFamily: FONT_SANS.medium, fontSize: 14 },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  liveText: { fontFamily: FONT_SANS.semibold, fontSize: 12 },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  miniCard: {
    width: '48%',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 8,
    minHeight: 132,
  },
  miniIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniValue: {
    fontFamily: FONT_SANS.bold,
    fontSize: 28,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  miniLabel: { fontFamily: FONT_SANS.medium, fontSize: 13 },
  miniTrend: { fontFamily: FONT_SANS.semibold, fontSize: 12, marginTop: 2 },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    gap: 12,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: { fontFamily: FONT_SANS.bold, fontSize: 17 },
  link: { fontFamily: FONT_SANS.semibold, fontSize: 14 },
  incomeHero: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  incomeValue: {
    fontFamily: FONT_SANS.bold,
    fontSize: 30,
    letterSpacing: -0.6,
    fontVariant: ['tabular-nums'],
  },
  growthPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  growthText: { fontFamily: FONT_SANS.semibold, fontSize: 12 },
  incomeSub: { fontFamily: FONT_SANS.regular, fontSize: 14 },
  bars: { gap: 12, marginTop: 4 },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  barLabel: {
    width: 32,
    fontFamily: FONT_SANS.medium,
    fontSize: 13,
  },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 999 },
  barAmount: {
    width: 52,
    textAlign: 'right',
    fontFamily: FONT_SANS.semibold,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  emptyBars: { fontFamily: FONT_SANS.regular, fontSize: 14, paddingVertical: 8 },
  emptyList: { fontFamily: FONT_SANS.regular, fontSize: 14, paddingBottom: 4 },
  expireRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  expireAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expireInitials: { fontFamily: FONT_SANS.bold, fontSize: 14 },
  expireMeta: { flex: 1, minWidth: 0, gap: 3 },
  expireName: { fontFamily: FONT_SANS.semibold, fontSize: 16 },
  expireSub: { fontFamily: FONT_SANS.regular, fontSize: 13 },
  expireRight: { alignItems: 'flex-end', gap: 4 },
  expireBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  expireBadgeText: { fontFamily: FONT_SANS.semibold, fontSize: 11 },
  expireDate: { fontFamily: FONT_SANS.regular, fontSize: 12 },
  alertCount: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  alertCountText: { fontFamily: FONT_SANS.semibold, fontSize: 12 },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  alertBody: { flex: 1, fontFamily: FONT_SANS.regular, fontSize: 15, lineHeight: 21 },
});

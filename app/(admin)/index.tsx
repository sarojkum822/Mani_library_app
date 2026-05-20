import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useStaleWhileRevalidate } from '@/hooks/useStaleWhileRevalidate';
import { cacheKeys } from '@/lib/dataCache';
import { Link, router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdminAvatar } from '@/components/admin/AdminAvatar';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { AdminKpiCard } from '@/components/admin/AdminKpiCard';
import { AdminKpiSkeleton } from '@/components/admin/AdminKpiSkeleton';
import { AdminOverviewMetricsRow } from '@/components/admin/AdminOverviewMetricsRow';
import { AdminListRow } from '@/components/admin/AdminListRow';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminSectionCard } from '@/components/admin/AdminSectionCard';
import { CLARITY_METRIC_LABEL } from '@/components/admin/clarityTokens';
import { adminScrollContentInsets } from '@/components/admin/layoutTokens';
import { useAuth } from '@/components/auth/AuthProvider';
import { useLibraryInfo } from '@/components/library/LibraryInfoProvider';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { api, type AdminOverviewSnapshot } from '@/lib/api';
import { daysUntil, formatCurrency, formatDate, membershipPlanKindLabel, planName, adminPaymentStatusTone, adminPaymentStatusLabel } from '@/lib/members';
import { sortRecords, statusLabel, todayDMY, type PunchRecord } from '@/lib/attendance';
import { deviceUserIdInlineLabel } from '@/lib/deviceUserIdLabel';
import { StatusBadge } from '@/components/ui/StatusBadge';

export default function AdminDashboard() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();
  const lib = useLibraryInfo();
  const { auth } = useAuth();
  const token = auth.status === 'signed_in' ? auth.token : null;

  const [attendancePreview, setAttendancePreview] = useState<PunchRecord[]>([]);
  const [attLoading, setAttLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchOverview = useCallback(async () => {
    if (!token) throw new Error('Sign in as admin to load live stats.');
    return api.adminOverview(token);
  }, [token]);

  const {
    data: overview,
    loading: overviewLoading,
    revalidating,
    error: overviewErr,
  } = useStaleWhileRevalidate<AdminOverviewSnapshot>({
    cacheKey: cacheKeys.adminOverview,
    fetcher: fetchOverview,
    refreshKey,
    enabled: !!token,
  });

  const loadAttendance = useCallback(async () => {
    if (!token) {
      setAttendancePreview([]);
      return;
    }
    setAttLoading(true);
    try {
      const att = await api.adminDailyAttendance(token, { fromDate: todayDMY(), toDate: todayDMY() });
      setAttendancePreview(sortRecords(att).slice(0, 6));
    } catch {
      setAttendancePreview([]);
    } finally {
      setAttLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadAttendance();
  }, [loadAttendance, refreshKey]);

  const refreshAll = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const stats = overview?.stats;
  const seatSnapshot = overview?.seatSnapshot ?? { longTermDistinctSeats: 0, shortTermDistinctSeats: 0 };
  const total = stats?.totalMembers ?? 0;
  const registered = stats?.registeredAccounts ?? total;
  const active = stats?.activeTotal ?? 0;
  const activeMembers = stats?.activeMembersDistinct ?? active;
  const activeLong = stats?.activeLong ?? 0;
  const activeShort = stats?.activeShort ?? 0;
  const revenue30d = stats?.revenue30dInr ?? 0;
  const revenueToday = stats?.revenueTodayInr ?? 0;
  const paidToday = stats?.paidCountToday ?? 0;
  const pending = stats?.pendingPayments ?? 0;
  const totalPaidAll = stats?.totalPaidRevenueInr ?? 0;
  const newMem30 = stats?.newMemberships30d ?? 0;

  const expiring = useMemo(() => {
    const list = [...(overview?.expiringSoon ?? [])];
    return list.sort((a, b) => {
      if (a.expiryDate === '9999-12-31') return 1;
      if (b.expiryDate === '9999-12-31') return -1;
      return daysUntil(a.expiryDate) - daysUntil(b.expiryDate);
    });
  }, [overview?.expiringSoon]);

  const recent = (overview?.recentPayments ?? []).slice(0, 5);

  const seatCap = lib.capacity;
  const now = new Date();
  const headlineDate = now.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const weekday = now.toLocaleDateString('en-IN', { weekday: 'long' });

  const presentCount = attendancePreview.filter((r) => r.Status === 'P').length;
  const absentCount = attendancePreview.filter((r) => r.Status === 'A').length;

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: c.surfaceMuted }]}
      contentContainerStyle={adminScrollContentInsets(insets.bottom)}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={revalidating || attLoading} onRefresh={refreshAll} tintColor={c.azure500} />
      }
    >
      {revalidating ? (
        <Text style={{ color: c.ink500, marginBottom: 8, fontSize: 11, fontWeight: '600', textAlign: 'right' }}>
          Updating…
        </Text>
      ) : null}
      {overviewLoading && !overview ? <AdminKpiSkeleton count={5} /> : null}
      {overviewErr && !overview ? (
        <Text style={{ color: c.azure700, marginBottom: 12, fontWeight: '500' }}>{overviewErr}</Text>
      ) : null}

      <AdminPageHeader
        eyebrow="overview"
        title="Overview"
        hero
        description="Live library stats — registrations, payments, and attendance."
      />

      {overview ? (
        <AdminOverviewMetricsRow>
          <AdminKpiCard
            label="Registered users"
            value={String(registered)}
            hint="Signed up on the website or app"
            icon="user-plus"
          />
          <AdminKpiCard
            label="Active members"
            value={String(activeMembers)}
            hint="Bought a plan · membership active now"
            icon="users"
          />
          <AdminKpiCard
            label="Active plans"
            value={String(active)}
            hint={[
              `${activeLong} long · ${activeShort} short`,
              `Seats in use: ${seatSnapshot.longTermDistinctSeats} long · ${seatSnapshot.shortTermDistinctSeats} short`,
              `Roster ${total}${newMem30 > 0 ? ` · +${newMem30} new (30d)` : ''}`,
            ].join('\n')}
            icon="refresh"
          />
          <AdminKpiCard
            label="Income · 30 days"
            value={formatCurrency(lib, revenue30d)}
            hint={[
              `${stats?.paidCount30d ?? 0} paid charges`,
              `All-time paid ${formatCurrency(lib, totalPaidAll)}`,
            ].join('\n')}
            icon="line-chart"
          />
          <AdminKpiCard
            label="Income · today"
            value={formatCurrency(lib, revenueToday)}
            hint={`${paidToday} payment${paidToday === 1 ? '' : 's'}`}
            icon="bolt"
          />
        </AdminOverviewMetricsRow>
      ) : null}

      {overview ? (
      <>
      <AdminSectionCard
        title="Subscriptions expiring soon"
        description="Members whose plan ends within the next 7 days."
        paddedBody={false}
        accent={expiring.length > 0 ? 'warning' : 'default'}
        right={
          <Link href="/(admin)/subscriptions" asChild>
            <Pressable hitSlop={8}>
              <Text style={[styles.link, { color: c.azure500 }]}>View all →</Text>
            </Pressable>
          </Link>
        }
      >
        {expiring.length === 0 ? (
          <AdminEmptyState title="All clear" body="No renewals due in the next 7 days." />
        ) : (
          expiring.map((m, i) => {
            const d = m.expiryDate === '9999-12-31' ? 999 : daysUntil(m.expiryDate);
            const tone = d <= 2 ? 'warn' : 'neutral';
            const dayLabel = d >= 999 ? '—' : d <= 0 ? 'Today' : d === 1 ? '1 day' : `${d} days`;
            return (
              <AdminListRow
                key={m.id}
                last={i === expiring.length - 1}
                left={<AdminAvatar name={m.name} />}
                title={m.name}
                subtitle={`${deviceUserIdInlineLabel(m.libraryNumber)} · Seat ${m.seatNo} · Ends ${m.endLabel}`}
                right={<StatusBadge tone={tone === 'warn' ? 'warn' : 'neutral'} dot label={dayLabel} />}
                onPress={() => {
                  if (m.userId) router.push(`/(admin)/member/${encodeURIComponent(m.userId)}`);
                  else router.push('/(admin)/subscriptions');
                }}
              />
            );
          })
        )}
      </AdminSectionCard>

      <AdminSectionCard
        title="Today"
        description={`${headlineDate} · ${weekday}`}
        paddedBody={false}
      >
        <View style={styles.todayStats}>
          <TodayStat label="All-time paid" value={formatCurrency(lib, totalPaidAll)} />
          <TodayStat label="New members (30d)" value={String(newMem30)} />
        </View>
        <GlanceBar
          label="Active vs capacity"
          value={`${active} / ${seatCap}`}
          pct={Math.min(100, seatCap ? (active / seatCap) * 100 : 0)}
        />
        <View style={{ height: 12 }} />
        <GlanceBar
          label="Pending checkout"
          value={`${pending} pending`}
          pct={Math.min(100, total ? (pending / total) * 100 : 0)}
        />
      </AdminSectionCard>

      <AdminSectionCard
        title="Today's attendance"
        description={`${presentCount} present · ${absentCount} absent · ${attendancePreview[0]?.DateString ?? '—'}`}
        paddedBody={false}
      >
        {attendancePreview.length === 0 ? (
          <AdminEmptyState title="No attendance yet" body="Today's punch data will appear here when available." />
        ) : (
          attendancePreview.map((r, i) => (
            <AdminListRow
              key={`${r.Empcode}-${i}`}
              last={i === attendancePreview.length - 1}
              title={r.Name}
              subtitle={`${r.Empcode} · In ${r.INTime} · Out ${r.OUTTime}`}
              right={
                <StatusBadge
                  tone={r.Status === 'P' ? 'azure' : r.Status === 'A' ? 'danger' : 'warn'}
                  label={statusLabel(r.Status)}
                />
              }
              onPress={() => router.push('/(admin)/attendance')}
            />
          ))
        )}
      </AdminSectionCard>

      <AdminSectionCard
        title="Recent payments"
        description="Latest payments from the database."
        paddedBody={false}
        right={
          <Link href="/(admin)/payments" asChild>
            <Pressable hitSlop={8}>
              <Text style={[styles.link, { color: c.azure500 }]}>View all →</Text>
            </Pressable>
          </Link>
        }
      >
        {recent.length === 0 ? (
          <AdminEmptyState title="No payments" body="Recent charges will show here." />
        ) : (
          recent.map((p, i) => (
            <AdminListRow
              key={p.id || String(i)}
              last={i === recent.length - 1}
              left={<AdminAvatar name={p.name} small />}
              title={p.name}
              subtitle={`${planName(lib, p.plan)} · ${formatDate(p.date)}`}
              detail={formatCurrency(lib, p.amount)}
              right={
                <StatusBadge tone={adminPaymentStatusTone(p.status)} label={adminPaymentStatusLabel(p.status)} />
              }
              showChevron={false}
              onPress={() => router.push('/(admin)/payments')}
            />
          ))
        )}
      </AdminSectionCard>
      </>
      ) : null}
    </ScrollView>
  );
}

function TodayStat({ label, value }: { label: string; value: string }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <View style={styles.todayStat}>
      <Text style={[styles.todayLabel, CLARITY_METRIC_LABEL, { color: c.ink500 }]}>{label}</Text>
      <Text style={[styles.todayValue, { color: c.ink900 }]}>{value}</Text>
    </View>
  );
}

function GlanceBar({ label, value, pct }: { label: string; value: string; pct: number }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const w = Math.max(0, Math.min(100, pct));
  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
      <View style={styles.glanceRow}>
        <Text style={[styles.glanceLabel, { color: c.ink600 }]}>{label}</Text>
        <Text style={[styles.glanceValue, { color: c.ink900 }]}>{value}</Text>
      </View>
      <View style={[styles.track, { backgroundColor: c.ink100 }]}>
        <View style={[styles.fill, { width: `${w}%`, backgroundColor: c.azure500 }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  link: { fontSize: 12, fontWeight: '700' },
  todayStats: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  todayStat: { flex: 1, gap: 4 },
  todayLabel: {},
  todayValue: { fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  glanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  glanceLabel: { fontSize: 13, fontWeight: '500' },
  glanceValue: { fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  track: { marginTop: 8, height: 6, borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
});

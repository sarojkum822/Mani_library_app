import { router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CopyIdButton } from '@/components/admin/CopyIdButton';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { AdminListRow } from '@/components/admin/AdminListRow';
import { AdminListSkeleton } from '@/components/admin/AdminListSkeleton';
import { AdminMetricTile } from '@/components/admin/AdminMetricTile';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminSectionCard } from '@/components/admin/AdminSectionCard';
import { AdminSegmentedControl, type AdminSegment } from '@/components/admin/AdminSegmentedControl';
import { adminScrollContentInsets } from '@/components/admin/layoutTokens';
import { useAuth } from '@/components/auth/AuthProvider';
import { useLibraryInfo } from '@/components/library/LibraryInfoProvider';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useStaleWhileRevalidate } from '@/hooks/useStaleWhileRevalidate';
import { deviceUserIdInlineLabel } from '@/lib/deviceUserIdLabel';
import {
  api,
  type AdminOverviewStats,
  type AdminPaymentListRow,
  type AdminPaymentListProfile,
} from '@/lib/api';
import { cacheKeys } from '@/lib/dataCache';
import {
  adminPaymentStatusLabel,
  adminPaymentStatusTone,
  formatCurrency,
  formatDateTimeShort,
} from '@/lib/members';

type StatusFilter = 'all' | 'pending' | 'paid' | 'failed' | 'refunded';

type PaymentsScreenData = {
  stats: AdminOverviewStats;
  rows: AdminPaymentListRow[];
  profiles: Record<string, AdminPaymentListProfile>;
};

const FILTER_SEGMENTS: AdminSegment<StatusFilter>[] = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'paid', label: 'Paid' },
  { id: 'failed', label: 'Failed' },
  { id: 'refunded', label: 'Refunded' },
];

function shortIdPreview(id: string): string {
  const s = id.trim();
  if (!s) return '—';
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) {
    return `${s.slice(0, 8)}…${s.slice(-4)}`;
  }
  if (s.length <= 14) return s;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

export default function AdminPaymentsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();
  const lib = useLibraryInfo();
  const { auth } = useAuth();
  const token = auth.status === 'signed_in' ? auth.token : null;

  const [refreshKey, setRefreshKey] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchPaymentsScreen = useCallback(async (): Promise<PaymentsScreenData> => {
    if (!token) throw new Error('Sign in as admin.');
    const [ov, pay] = await Promise.all([api.adminOverview(token), api.adminPaymentsList(token)]);
    return { stats: ov.stats, rows: pay.rows, profiles: pay.profiles };
  }, [token]);

  const { data, loading, revalidating, error } = useStaleWhileRevalidate<PaymentsScreenData>({
    cacheKey: cacheKeys.adminPaymentsScreen,
    fetcher: fetchPaymentsScreen,
    refreshKey,
    enabled: !!token,
  });

  const stats = data?.stats;
  const rows = data?.rows ?? [];
  const profiles = data?.profiles ?? {};

  const counts = useMemo(() => {
    const cts: Record<StatusFilter, number> = {
      all: rows.length,
      pending: 0,
      paid: 0,
      failed: 0,
      refunded: 0,
    };
    for (const r of rows) {
      const k = r.status.toLowerCase() as StatusFilter;
      if (k === 'pending') cts.pending += 1;
      else if (k === 'paid') cts.paid += 1;
      else if (k === 'failed') cts.failed += 1;
      else if (k === 'refunded') cts.refunded += 1;
    }
    return cts;
  }, [rows]);

  const segments = useMemo(
    () => FILTER_SEGMENTS.map((seg) => ({ ...seg, count: counts[seg.id] })),
    [counts],
  );

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return rows;
    return rows.filter((r) => r.status.toLowerCase() === statusFilter);
  }, [rows, statusFilter]);

  const bumpRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: c.surfaceMuted }]}
      contentContainerStyle={adminScrollContentInsets(insets.bottom)}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={loading && !!data}
          onRefresh={bumpRefresh}
          tintColor={c.azure500}
        />
      }
    >
      <AdminPageHeader
        eyebrow="payments"
        title="Payments"
        description="Charges and checkout status — tap a row for member details."
      />
      {revalidating ? (
        <Text style={{ color: c.ink500, marginBottom: 8, fontSize: 11, fontWeight: '600', textAlign: 'right' }}>
          Updating…
        </Text>
      ) : null}
      {error && !data ? (
        <AdminEmptyState title="Could not load" body={error} actionLabel="Retry" onAction={bumpRefresh} />
      ) : null}
      {loading && !data ? <AdminListSkeleton rows={4} /> : null}

      {stats ? (
        <>
          <View style={styles.tiles}>
            <AdminMetricTile
              tone="azure"
              label="Revenue · 30 days"
              value={formatCurrency(lib, stats.revenue30dInr)}
              hint={`${stats.paidCount30d} paid`}
            />
            <AdminMetricTile
              label="Today"
              value={formatCurrency(lib, stats.revenueTodayInr)}
              hint={`${stats.paidCountToday} payments`}
            />
            <AdminMetricTile label="All-time paid" value={formatCurrency(lib, stats.totalPaidRevenueInr)} />
            <AdminMetricTile label="Pending" value={String(stats.pendingPayments)} hint="Awaiting capture" />
          </View>

          <AdminSegmentedControl segments={segments} value={statusFilter} onChange={setStatusFilter} />

          <Text style={[styles.rowCount, { color: c.ink500 }]}>
            {filtered.length} charge{filtered.length === 1 ? '' : 's'} · newest first (up to 80)
          </Text>

          <AdminSectionCard title="Charges" paddedBody={false}>
            {filtered.length === 0 ? (
              <AdminEmptyState
                title="No charges"
                body={rows.length === 0 ? 'Pull down to refresh.' : 'No rows match this filter.'}
              />
            ) : (
              filtered.map((r, i) => {
                const p = profiles[r.userId];
                const libNo = p ? String(p.deviceUserId).padStart(4, '0') : '—';
                const name = p?.fullName ?? 'Unknown member';
                const amount = formatCurrency(lib, Number(r.amountRupees));
                const expanded = expandedId === r.id;

                return (
                  <View key={r.id}>
                    <AdminListRow
                      last={!expanded && i === filtered.length - 1}
                      title={name}
                      subtitle={`${deviceUserIdInlineLabel(libNo)} · ${formatDateTimeShort(r.createdAt)}`}
                      detail={amount}
                      right={
                        <StatusBadge tone={adminPaymentStatusTone(r.status)} label={adminPaymentStatusLabel(r.status)} />
                      }
                      onPress={() => setExpandedId(expanded ? null : r.id)}
                      showChevron
                    />
                    {expanded ? (
                      <View style={[styles.expand, { borderBottomColor: c.border, backgroundColor: c.surfaceMuted }]}>
                        <Text style={[styles.expandLabel, { color: c.ink500 }]}>Payment row</Text>
                        <CopyIdButton value={r.id} preview={shortIdPreview(r.id)} label="Copy row id" />
                        {r.razorpayPaymentId ? (
                          <CopyIdButton
                            value={r.razorpayPaymentId}
                            preview={shortIdPreview(r.razorpayPaymentId)}
                            label="Copy Razorpay payment id"
                          />
                        ) : null}
                        {r.razorpayOrderId ? (
                          <CopyIdButton
                            value={r.razorpayOrderId}
                            preview={shortIdPreview(r.razorpayOrderId)}
                            label="Copy Razorpay order id"
                          />
                        ) : null}
                        {r.detail?.trim() ? (
                          <Text style={[styles.detail, { color: c.ink700 }]}>{r.detail}</Text>
                        ) : null}
                        <AdminListRow
                          last={i === filtered.length - 1}
                          title="Open member profile"
                          showChevron
                          onPress={() => router.push(`/(admin)/member/${encodeURIComponent(r.userId)}`)}
                        />
                      </View>
                    ) : null}
                  </View>
                );
              })
            )}
          </AdminSectionCard>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tiles: { gap: 12 },
  rowCount: { fontSize: 13, fontWeight: '500', marginTop: 4 },
  expand: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  expandLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  detail: { fontSize: 13, lineHeight: 18 },
});

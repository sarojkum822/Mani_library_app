import React, { useCallback, useEffect, useState } from 'react';
import { useStaleWhileRevalidate } from '@/hooks/useStaleWhileRevalidate';
import { cacheKeys } from '@/lib/dataCache';
import { router } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdminOverviewDashboard } from '@/components/admin/AdminOverviewDashboard';
import { AdminOverviewDashboardSkeleton } from '@/components/admin/AdminOverviewDashboardSkeleton';
import { adminScrollContentInsets } from '@/components/admin/layoutTokens';
import { useAuth } from '@/components/auth/AuthProvider';
import { useLibraryInfo } from '@/components/library/LibraryInfoProvider';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { api, type AdminOverviewSnapshot } from '@/lib/api';
import { sortRecords, todayDMY, type PunchRecord } from '@/lib/attendance';

const EMPTY_CHART: AdminOverviewSnapshot['chart'] = {
  revenueByDay: [],
  membershipsCreatedByDay: [],
  maxRevenueInr: 0,
  maxMembershipsCreated: 0,
};

export default function AdminDashboard() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();
  const lib = useLibraryInfo();
  const { auth } = useAuth();
  const token = auth.status === 'signed_in' ? auth.token : null;

  const [attendanceToday, setAttendanceToday] = useState<PunchRecord[]>([]);
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
      setAttendanceToday([]);
      return;
    }
    setAttLoading(true);
    try {
      const att = await api.adminDailyAttendance(token, { fromDate: todayDMY(), toDate: todayDMY() });
      setAttendanceToday(sortRecords(att));
    } catch {
      setAttendanceToday([]);
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

  const overviewWithChart = overview
    ? { ...overview, chart: overview.chart ?? EMPTY_CHART }
    : null;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={adminScrollContentInsets(insets.bottom)}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={revalidating && !!overview} onRefresh={refreshAll} tintColor={c.azure500} />
      }
    >
      {revalidating && overview ? (
        <Text style={{ color: c.ink400, marginBottom: 8, fontSize: 10, fontWeight: '500', textAlign: 'right' }}>
          Updating…
        </Text>
      ) : null}
      {overviewErr && !overview ? (
        <Text style={{ color: c.azure700, marginBottom: 12, fontWeight: '500' }}>{overviewErr}</Text>
      ) : null}

      {overviewWithChart ? (
        <AdminOverviewDashboard
          lib={lib}
          overview={overviewWithChart}
          todayCheckIns={attLoading ? 0 : attendanceToday.length}
          onOpenPayments={() => router.push('/(admin)/payments')}
          onOpenSubscriptions={() => router.push('/(admin)/subscriptions')}
          onOpenAttendance={() => router.push('/(admin)/attendance')}
          onOpenMembers={() => router.push('/(admin)/members')}
        />
      ) : (
        <AdminOverviewDashboardSkeleton />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

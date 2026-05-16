import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AdminDateRangeFilter,
  type AdminDateRange,
} from '@/components/admin/AdminDateRangeFilter';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { AdminListRow } from '@/components/admin/AdminListRow';
import { AdminMetricTile } from '@/components/admin/AdminMetricTile';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminSearchField } from '@/components/admin/AdminSearchField';
import { adminScrollContentInsets } from '@/components/admin/layoutTokens';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/components/auth/AuthProvider';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { api } from '@/lib/api';
import { isoToDMY, deviceUserIdToEmpcode, todayIsoYmd } from '@/lib/adminDates';
import { DEVICE_USER_ID_LABEL } from '@/lib/deviceUserIdLabel';
import {
  groupRecordsByDate,
  sortRecordsByDate,
  statusLabel,
  type PunchRecord,
} from '@/lib/attendance';

const initialRange = (): AdminDateRange => {
  const today = todayIsoYmd();
  return { fromIso: today, toIso: today, preset: 'today' };
};

export default function AdminAttendanceScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();
  const { auth } = useAuth();
  const token = auth.status === 'signed_in' ? auth.token : null;

  const [rows, setRows] = useState<PunchRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [libraryQuery, setLibraryQuery] = useState('');
  const [appliedLibrary, setAppliedLibrary] = useState('');
  const [draftRange, setDraftRange] = useState<AdminDateRange>(initialRange);
  const [appliedRange, setAppliedRange] = useState<AdminDateRange>(initialRange);

  const load = useCallback(async () => {
    if (!token) {
      setRows([]);
      setErr('Sign in as admin to load attendance.');
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const fromDate = isoToDMY(appliedRange.fromIso);
      const toDate = isoToDMY(appliedRange.toIso);
      const trimmed = appliedLibrary.trim();
      const empcode = trimmed ? deviceUserIdToEmpcode(trimmed) : undefined;
      const list = await api.adminDailyAttendance(token, { fromDate, toDate, empcode });
      setRows(sortRecordsByDate(list));
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Could not load attendance.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [token, appliedLibrary, appliedRange.fromIso, appliedRange.toIso]);

  const handleRangeChange = useCallback((next: AdminDateRange) => {
    setDraftRange(next);
    if (next.preset !== 'custom') {
      setAppliedRange(next);
    }
  }, []);

  const applyDates = useCallback(() => {
    setAppliedRange(draftRange);
  }, [draftRange]);

  useEffect(() => {
    void load();
  }, [load]);

  const present = rows.filter((r) => r.Status === 'P').length;
  const absent = rows.filter((r) => r.Status === 'A').length;
  const sections = useMemo(() => groupRecordsByDate(rows), [rows]);
  const multiDay = appliedRange.fromIso !== appliedRange.toIso;

  const ListHeader = useCallback(
    () => (
      <View style={{ paddingBottom: 14, gap: 12 }}>
        <AdminPageHeader
          eyebrow="attendance"
          title="Attendance"
          description={`Daily gate summary — pick a date range and optional ${DEVICE_USER_ID_LABEL.toLowerCase()}.`}
        />

        <AdminDateRangeFilter
          value={draftRange}
          onChange={handleRangeChange}
          onApply={applyDates}
          applying={loading}
        />

        <AdminSearchField
          value={libraryQuery}
          onChangeText={setLibraryQuery}
          placeholder={`${DEVICE_USER_ID_LABEL} (optional)`}
          keyboardType="number-pad"
          returnKeyType="search"
          onSubmitEditing={() => setAppliedLibrary(libraryQuery.trim())}
        />

        {appliedLibrary.trim() ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear library filter"
            onPress={() => {
              setLibraryQuery('');
              setAppliedLibrary('');
            }}
            style={[styles.filterChip, { backgroundColor: c.azure50 }]}
          >
            <Text style={[styles.filterChipText, { color: c.azure700 }]}>
              Member {deviceUserIdToEmpcode(appliedLibrary)} · Tap to clear
            </Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => setAppliedLibrary(libraryQuery.trim())}
            style={({ pressed }) => [
              styles.memberApply,
              { borderColor: c.border, backgroundColor: c.surface, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <Text style={[styles.memberApplyText, { color: c.ink800 }]}>Apply member filter</Text>
          </Pressable>
        )}

        <View style={styles.tiles}>
          <AdminMetricTile label="Present" value={String(present)} tone="azure" />
          <AdminMetricTile label="Absent" value={String(absent)} />
          <AdminMetricTile label="Rows" value={String(rows.length)} hint="Punch rows in range" />
        </View>

        {err ? (
          <AdminEmptyState title="Could not load" body={err} actionLabel="Retry" onAction={() => void load()} />
        ) : null}
        {loading && rows.length === 0 && !err ? (
          <ActivityIndicator style={{ marginTop: 8 }} color={c.azure500} />
        ) : null}
      </View>
    ),
    [
      absent,
      applyDates,
      appliedLibrary,
      c.azure50,
      c.azure500,
      c.azure700,
      c.border,
      c.ink800,
      c.surface,
      draftRange,
      err,
      libraryQuery,
      load,
      loading,
      present,
      rows.length,
    ],
  );

  return (
    <View style={[styles.root, { backgroundColor: c.surfaceMuted }]}>
      <SectionList
        sections={sections}
        keyExtractor={(r) => `${r.DateString}-${r.Empcode}-${r.INTime}`}
        ListHeaderComponent={ListHeader}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={c.azure500} />}
        contentContainerStyle={[adminScrollContentInsets(insets.bottom, 14), styles.listPad]}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled
        renderSectionHeader={({ section }) =>
          multiDay ? (
            <View style={[styles.sectionHead, { backgroundColor: c.surfaceMuted, borderColor: c.border }]}>
              <Text style={[styles.sectionTitle, { color: c.ink900 }]}>{section.title}</Text>
              <Text style={[styles.sectionCount, { color: c.ink500 }]}>
                {section.data.length} row{section.data.length === 1 ? '' : 's'}
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item, index, section }) => (
          <View
            style={[
              styles.card,
              { backgroundColor: c.surface, borderColor: c.border },
              index === 0 && multiDay && styles.cardSectionFirst,
            ]}
          >
            <AdminListRow
              last={index === section.data.length - 1}
              title={item.Name}
              subtitle={
                multiDay
                  ? `${item.Empcode} · In ${item.INTime} · Out ${item.OUTTime}`
                  : `${item.Empcode} · In ${item.INTime} · Out ${item.OUTTime} · Work ${item.WorkTime}`
              }
              right={
                <StatusBadge
                  tone={item.Status === 'P' ? 'azure' : item.Status === 'A' ? 'danger' : 'warn'}
                  label={statusLabel(item.Status)}
                  dot
                />
              }
              showChevron={false}
            />
          </View>
        )}
        ListEmptyComponent={
          !loading && !err ? (
            <AdminEmptyState
              title="No attendance in range"
              body="Try another date range or clear the member filter. Data appears after gate check-ins sync."
              actionLabel="Reload"
              onAction={() => void load()}
            />
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  listPad: { flexGrow: 1 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  filterChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  filterChipText: { fontSize: 13, fontWeight: '600' },
  memberApply: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberApplyText: { fontSize: 15, fontWeight: '600' },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  sectionCount: { fontSize: 13, fontWeight: '500' },
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
    overflow: 'hidden',
  },
  cardSectionFirst: { marginTop: 0 },
});

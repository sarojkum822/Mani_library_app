import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
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
import { AdminListSkeleton } from '@/components/admin/AdminListSkeleton';
import { AdminSearchField } from '@/components/admin/AdminSearchField';
import { adminScrollContentInsets } from '@/components/admin/layoutTokens';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/components/auth/AuthProvider';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { api } from '@/lib/api';
import {
  loadAdminAttendancePrefs,
  loadAttendanceDiskCache,
  saveAdminAttendancePrefs,
  saveAttendanceDiskCache,
} from '@/lib/adminAttendancePrefs';
import { isoToDMY, deviceUserIdToEmpcode, todayIsoYmd } from '@/lib/adminDates';
import { cacheKeys, getDataCache, setDataCache } from '@/lib/dataCache';
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

function StatPill({
  label,
  value,
  accent,
  loading,
}: {
  label: string;
  value: string;
  accent?: string;
  loading?: boolean;
}) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <View style={[styles.statPill, { backgroundColor: c.surface, borderColor: c.border }]}>
      {loading ? (
        <View style={[styles.statValueBone, { backgroundColor: c.ink100 }]} />
      ) : (
        <Text style={[styles.statValue, { color: accent ?? c.ink900 }]}>{value}</Text>
      )}
      <Text style={[styles.statLabel, { color: c.ink500 }]}>{label}</Text>
    </View>
  );
}

export default function AdminAttendanceScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();
  const { auth } = useAuth();
  const token = auth.status === 'signed_in' ? auth.token : null;

  const [prefsReady, setPrefsReady] = useState(false);
  const [rows, setRows] = useState<PunchRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [libraryQuery, setLibraryQuery] = useState('');
  const [appliedLibrary, setAppliedLibrary] = useState('');
  const [draftRange, setDraftRange] = useState<AdminDateRange>(initialRange);
  const [appliedRange, setAppliedRange] = useState<AdminDateRange>(initialRange);

  const appliedLibraryRef = useRef(appliedLibrary);
  const appliedRangeRef = useRef(appliedRange);

  useEffect(() => {
    appliedLibraryRef.current = appliedLibrary;
  }, [appliedLibrary]);

  useEffect(() => {
    appliedRangeRef.current = appliedRange;
  }, [appliedRange]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const saved = await loadAdminAttendancePrefs();
      if (cancelled) return;
      if (saved) {
        setDraftRange(saved.range);
        setAppliedRange(saved.range);
        setLibraryQuery(saved.libraryFilter);
        setAppliedLibrary(saved.libraryFilter);
      }
      setPrefsReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persistPrefs = useCallback((range: AdminDateRange, libraryFilter: string) => {
    void saveAdminAttendancePrefs({ range, libraryFilter });
  }, []);

  const attendanceCacheKey = useCallback((range: AdminDateRange, library: string) => {
    const emp = library.trim() ? deviceUserIdToEmpcode(library.trim()) : '';
    return cacheKeys.adminAttendance(range.fromIso, range.toIso, emp);
  }, []);

  const hydrateFromCache = useCallback(
    async (key: string): Promise<boolean> => {
      const mem = getDataCache<PunchRecord[]>(key);
      if (mem?.length) {
        setRows(mem);
        return true;
      }
      const disk = await loadAttendanceDiskCache(key);
      if (disk?.length) {
        setRows(sortRecordsByDate(disk));
        setDataCache(key, disk);
        return true;
      }
      return false;
    },
    [],
  );

  const load = useCallback(
    async (opts?: { pull?: boolean }) => {
      if (!token) {
        setRows([]);
        setErr('Sign in as admin to load attendance.');
        return;
      }

      const range = appliedRangeRef.current;
      const library = appliedLibraryRef.current;
      const key = attendanceCacheKey(range, library);
      const hadCache = await hydrateFromCache(key);

      if (opts?.pull) setPullRefreshing(true);
      else setLoading(true);

      setErr(null);

      try {
        const fromDate = isoToDMY(range.fromIso);
        const toDate = isoToDMY(range.toIso);
        const trimmed = library.trim();
        const empcode = trimmed ? deviceUserIdToEmpcode(trimmed) : undefined;
        const list = await api.adminDailyAttendance(token, { fromDate, toDate, empcode });
        const sorted = sortRecordsByDate(list);
        setRows(sorted);
        setDataCache(key, sorted);
        void saveAttendanceDiskCache(key, sorted);
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : 'Could not load attendance.');
        if (!hadCache) setRows([]);
      } finally {
        setLoading(false);
        setPullRefreshing(false);
      }
    },
    [attendanceCacheKey, hydrateFromCache, token],
  );

  const handleRangeChange = useCallback(
    (next: AdminDateRange) => {
      setDraftRange(next);
    },
    [],
  );

  const applyDates = useCallback(
    (range: AdminDateRange) => {
      setDraftRange(range);
      setAppliedRange(range);
      persistPrefs(range, appliedLibraryRef.current);
    },
    [persistPrefs],
  );

  const applyMemberFilter = useCallback(
    (trimmed: string) => {
      setAppliedLibrary(trimmed);
      persistPrefs(appliedRangeRef.current, trimmed);
    },
    [persistPrefs],
  );

  useEffect(() => {
    if (!prefsReady) return;
    void load();
  }, [load, prefsReady, appliedRange.fromIso, appliedRange.toIso, appliedLibrary]);

  const onPullRefresh = useCallback(() => {
    void load({ pull: true });
  }, [load]);

  const present = rows.filter((r) => r.Status === 'P').length;
  const absent = rows.filter((r) => r.Status === 'A').length;
  const sections = useMemo(() => groupRecordsByDate(rows), [rows]);
  const multiDay = appliedRange.fromIso !== appliedRange.toIso;
  const listBusy = loading && rows.length === 0;
  const listRevalidating = loading && rows.length > 0;

  return (
    <View style={styles.root}>
      <View style={[styles.filters, adminScrollContentInsets(insets.bottom, 14)]}>
        <Text style={[styles.title, { color: c.ink900 }]}>Attendance</Text>

        <AdminDateRangeFilter
          variant="minimal"
          value={draftRange}
          onChange={handleRangeChange}
          onApply={applyDates}
        />

        <AdminSearchField
          value={libraryQuery}
          onChangeText={setLibraryQuery}
          placeholder={`${DEVICE_USER_ID_LABEL} filter (optional)`}
          keyboardType="number-pad"
          returnKeyType="search"
          onSubmitEditing={() => applyMemberFilter(libraryQuery.trim())}
        />

        {appliedLibrary.trim() ? (
          <Pressable
            onPress={() => {
              setLibraryQuery('');
              applyMemberFilter('');
            }}
            style={[styles.filterChip, { backgroundColor: c.azure50 }]}
          >
            <Text style={[styles.filterChipText, { color: c.azure700 }]}>
              Member {deviceUserIdToEmpcode(appliedLibrary)} · Clear
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => applyMemberFilter(libraryQuery.trim())}
            style={[styles.applyMember, { borderColor: c.border }]}
          >
            <Text style={[styles.applyMemberText, { color: c.ink700 }]}>Apply member filter</Text>
          </Pressable>
        )}

        <View style={styles.statRow}>
          <StatPill label="Present" value={String(present)} accent={c.emerald700} loading={loading} />
          <StatPill label="Absent" value={String(absent)} loading={loading} />
          <StatPill label="Rows" value={String(rows.length)} loading={loading} />
        </View>

        {err ? (
          <AdminEmptyState title="Could not load" body={err} actionLabel="Retry" onAction={() => void load()} />
        ) : null}
      </View>

      <SectionList
        style={styles.list}
        sections={sections}
        keyExtractor={(r) => `${r.DateString}-${r.Empcode}-${r.INTime}`}
        refreshControl={
          <RefreshControl refreshing={pullRefreshing} onRefresh={onPullRefresh} tintColor={c.azure500} />
        }
        contentContainerStyle={[styles.listPad, { paddingBottom: Math.max(insets.bottom, 14) }]}
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
              styles.rowCard,
              { backgroundColor: c.surface, borderColor: c.border, opacity: listRevalidating ? 0.55 : 1 },
            ]}
          >
            <AdminListRow
              last={index === section.data.length - 1}
              title={item.Name}
              subtitle={`${item.Empcode} · In ${item.INTime} · Out ${item.OUTTime}`}
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
          listBusy && !err ? (
            <AdminListSkeleton rows={6} />
          ) : !loading && !err ? (
            <AdminEmptyState
              title="No attendance in range"
              body="Pick dates above or try another member filter."
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
  filters: { gap: 12, paddingBottom: 8 },
  list: { flex: 1 },
  listPad: { flexGrow: 1, paddingHorizontal: 14 },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  statRow: { flexDirection: 'row', gap: 8 },
  statPill: {
    flex: 1,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
  },
  statValue: { fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  statValueBone: { width: 40, height: 22, borderRadius: 6, marginBottom: 2 },
  statLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  filterChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  filterChipText: { fontSize: 13, fontWeight: '600' },
  applyMember: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  applyMemberText: { fontSize: 14, fontWeight: '600' },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700' },
  sectionCount: { fontSize: 12, fontWeight: '500' },
  rowCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
    overflow: 'hidden',
  },
});

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/components/auth/AuthProvider';
import { useMemberPrefetch } from '@/components/member/MemberPrefetchProvider';
import { api, type MemberAttendanceDailyRow, type MemberAttendanceToday } from '@/lib/api';
import { InfoRow } from '@/components/student/profileShared';

function isDashTime(t: string | null | undefined): boolean {
  if (!t) return true;
  const s = t.trim();
  return s === '' || s === '--:--' || s === '00:00';
}

function cellTime(t: string | null | undefined): string {
  if (!t || isDashTime(t)) return '—';
  return t.trim();
}

/** Real gate punches for in/out (not placeholder / empty). */
function hasClockTime(t: string | null | undefined): boolean {
  if (!t) return false;
  const s = t.trim();
  return s !== '' && s !== '--:--' && s !== '00:00';
}

function hasPunchInOut(row: MemberAttendanceDailyRow): boolean {
  return hasClockTime(row.in_time) && hasClockTime(row.out_time);
}

function punchSummaryRows(row: MemberAttendanceDailyRow) {
  return (
    <>
      <InfoRow label="Date" value={row.date?.trim() || '—'} />
      <InfoRow label="In" value={cellTime(row.in_time)} />
      <InfoRow label="Out" value={cellTime(row.out_time)} last />
    </>
  );
}

export default function StudentAttendanceScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const { auth } = useAuth();
  const mp = useMemberPrefetch();
  const token = auth.status === 'signed_in' ? auth.token : null;
  const isStudent = auth.status === 'signed_in' && auth.user.role === 'student';

  const [localData, setLocalData] = useState<MemberAttendanceToday | null>(null);
  const [localLoading, setLocalLoading] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadLocal = useCallback(async () => {
    if (!token) {
      setLocalData(null);
      setLocalError(null);
      setLocalLoading(false);
      return;
    }
    setLocalError(null);
    try {
      setLocalLoading(true);
      const j = await api.memberAttendanceToday(token);
      setLocalData(j);
    } catch (e) {
      setLocalData(null);
      setLocalError(e instanceof Error ? e.message : 'Could not load attendance.');
    } finally {
      setLocalLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token || isStudent) {
      setLocalData(null);
      setLocalError(null);
      setLocalLoading(false);
      return;
    }
    void loadLocal();
  }, [token, isStudent, loadLocal]);

  const loading = isStudent ? mp.attendance == null && mp.attendanceError == null : localLoading;
  const data = isStudent ? mp.attendance : localData;
  const error = isStudent ? mp.attendanceError : localError;

  const history = data?.history ?? [];
  const punchHistory = useMemo(() => history.filter(hasPunchInOut), [history]);
  const showTodayPunches = data?.daily != null && hasPunchInOut(data.daily);
  const dayLabel = data?.attendanceDate ?? data?.today ?? '—';

  const reload = useCallback(async () => {
    if (!token) return;
    if (isStudent) await mp.refetch();
    else await loadLocal();
  }, [token, isStudent, mp.refetch, loadLocal]);

  const onRefresh = useCallback(() => {
    if (!token) return;
    setRefreshing(true);
    void (async () => {
      try {
        await reload();
      } finally {
        setRefreshing(false);
      }
    })();
  }, [reload, token]);

  if (!token) {
    return (
      <Screen title="Attendance" subtitle="Gate check-ins" scrollable>
        <Card style={{ padding: 20 }}>
          <Text style={{ color: c.ink900, fontSize: 17, fontWeight: '600' }}>Sign in</Text>
          <Text style={{ marginTop: 8, color: c.ink600, fontSize: 15, lineHeight: 22 }}>
            Sign in with your library account to see attendance from the gate system.
          </Text>
        </Card>
      </Screen>
    );
  }

  if (loading) {
    return (
      <Screen title="Attendance" subtitle="Gate check-ins" scrollable>
        <Card style={{ padding: 0, overflow: 'hidden', marginTop: 8 }}>
          <View style={{ paddingVertical: 28, alignItems: 'center' }}>
            <ActivityIndicator color={c.azure500} />
            <Text style={{ marginTop: 12, color: c.ink500, fontSize: 14 }}>Loading attendance…</Text>
          </View>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      title="Attendance"
      subtitle="Gate check-ins"
      scrollable={false}
      padded={false}
      right={
        <Pressable onPress={() => void reload()} disabled={refreshing} hitSlop={10}>
          <Text style={{ color: c.azure600, fontSize: 15, fontWeight: '600' }}>
            {refreshing ? '…' : 'Refresh'}
          </Text>
        </Pressable>
      }
    >
      <ScrollView
        style={{ flex: 1, backgroundColor: c.surfaceMuted }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.azure500} />}
        keyboardShouldPersistTaps="handled"
      >
        {error ? (
          <Card style={{ padding: 16, marginBottom: 14 }}>
            <Text style={{ color: c.ink900, fontWeight: '600' }}>Could not load</Text>
            <Text style={{ marginTop: 6, color: c.ink600, fontSize: 14, lineHeight: 20 }}>{error}</Text>
            <Button title="Try again" onPress={() => void reload()} style={{ marginTop: 12 }} />
          </Card>
        ) : (
          <>
            {showTodayPunches ? (
              <>
                <Text style={[styles.kicker, { color: c.ink500 }]}>Today · {dayLabel}</Text>
                <Card style={{ padding: 0, overflow: 'hidden', marginTop: 8 }}>
                  <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>{punchSummaryRows(data!.daily!)}</View>
                </Card>
              </>
            ) : null}

            {data?.note ? (
              <Text style={[styles.note, { color: c.ink600, marginTop: showTodayPunches ? 16 : 0 }]}>{data.note}</Text>
            ) : null}

            <Text
              style={[
                styles.kicker,
                { color: c.ink500, marginTop: showTodayPunches || data?.note ? 24 : 16 },
              ]}
            >
              Earlier
            </Text>
            <Card style={{ padding: 0, overflow: 'hidden', marginTop: 8 }}>
              {punchHistory.length === 0 ? (
                <View style={{ padding: 16 }}>
                  <Text style={{ color: c.ink500, fontSize: 15 }}>
                    No days with both in and out in this window.
                  </Text>
                </View>
              ) : (
                <View>
                  {punchHistory.map((row, index) => (
                    <View
                      key={`${row.date}-${index}`}
                      style={[
                        styles.histRow,
                        { borderBottomColor: c.border },
                        index === punchHistory.length - 1 && styles.histRowLast,
                      ]}
                    >
                      <Text style={[styles.histDate, { color: c.ink900 }]}>{row.date?.trim() || '—'}</Text>
                      <Text style={[styles.histMeta, { color: c.ink600 }]}>
                        In {cellTime(row.in_time)} · Out {cellTime(row.out_time)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </Card>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  note: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  histRow: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  histRowLast: { borderBottomWidth: 0 },
  histDate: { fontSize: 16, fontWeight: '600' },
  histMeta: { marginTop: 6, fontSize: 14, fontWeight: '400' },
});

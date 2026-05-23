import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdminKeyValueGroup } from '@/components/admin/AdminKeyValueGroup';
import { AdminListRow } from '@/components/admin/AdminListRow';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminSectionCard } from '@/components/admin/AdminSectionCard';
import { adminScrollContentInsets } from '@/components/admin/layoutTokens';
import { useAuth } from '@/components/auth/AuthProvider';
import { useLibraryInfo } from '@/components/library/LibraryInfoProvider';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Button } from '@/components/ui/Button';
import { MembershipStatusBadge } from '@/components/admin/MembershipStatusBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useStaleWhileRevalidate } from '@/hooks/useStaleWhileRevalidate';
import { api, type AdminOverviewStats, type AdminPaymentListProfile, type AdminPaymentListRow } from '@/lib/api';

type PaymentsScreenData = {
  stats: AdminOverviewStats;
  rows: AdminPaymentListRow[];
  profiles: Record<string, AdminPaymentListProfile>;
};
import { cacheKeys } from '@/lib/dataCache';
import { addDaysIsoYmd, deviceUserIdToEmpcode, isoToDMY, todayIsoYmd } from '@/lib/adminDates';
import { deviceUserIdInlineLabel } from '@/lib/deviceUserIdLabel';
import {
  adminPaymentStatusLabel,
  adminPaymentStatusTone,
  formatDate,
  formatDateTimeShort,
  membershipPlanKindLabel,
  planName,
  verificationStatusLabel,
  type Member,
} from '@/lib/members';
import { sortRecords, statusLabel, type PunchRecord } from '@/lib/attendance';

export default function AdminMemberDetailScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();
  const lib = useLibraryInfo();
  const { auth } = useAuth();
  const token = auth.status === 'signed_in' ? auth.token : null;

  const [refreshKey, setRefreshKey] = useState(0);
  const [attendance, setAttendance] = useState<PunchRecord[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  const uid = typeof userId === 'string' ? userId : '';

  const fetchMembers = useCallback(async () => {
    if (!token) throw new Error('Sign in as admin.');
    return api.adminMembersList(token);
  }, [token]);

  const fetchPaymentsScreen = useCallback(async (): Promise<PaymentsScreenData> => {
    if (!token) throw new Error('Sign in as admin.');
    const [ov, pay] = await Promise.all([api.adminOverview(token), api.adminPaymentsList(token)]);
    return { stats: ov.stats, rows: pay.rows, profiles: pay.profiles };
  }, [token]);

  const {
    data: members = [],
    loading: membersLoading,
    revalidating: membersRevalidating,
    error: membersError,
  } = useStaleWhileRevalidate<Member[]>({
    cacheKey: cacheKeys.adminMembers,
    fetcher: fetchMembers,
    refreshKey,
    enabled: !!token && !!uid,
  });

  const { data: payData } = useStaleWhileRevalidate<PaymentsScreenData>({
    cacheKey: cacheKeys.adminPaymentsScreen,
    fetcher: fetchPaymentsScreen,
    refreshKey,
    enabled: !!token && !!uid,
  });

  const membersList = members ?? [];

  const member = useMemo(
    () =>
      membersList.find((row) => row.userId === uid) ??
      membersList.find((row) => row.listKey === `account:${uid}`) ??
      null,
    [membersList, uid],
  );

  const payments = useMemo(
    () => (payData?.rows ?? []).filter((r) => r.userId === uid).slice(0, 12),
    [payData?.rows, uid],
  );

  const loading = membersLoading && !member;
  const err = membersError;
  const revalidating = membersRevalidating;

  useEffect(() => {
    if (!token || !member?.libraryNumber) {
      setAttendance([]);
      return;
    }
    let cancelled = false;
    setAttendanceLoading(true);
    void (async () => {
      try {
        const to = todayIsoYmd();
        const from = addDaysIsoYmd(to, -6);
        const punches = await api.adminDailyAttendance(token, {
          fromDate: isoToDMY(from),
          toDate: isoToDMY(to),
          empcode: deviceUserIdToEmpcode(member.libraryNumber),
        });
        if (!cancelled) setAttendance(sortRecords(punches));
      } catch {
        if (!cancelled) setAttendance([]);
      } finally {
        if (!cancelled) setAttendanceLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, member?.libraryNumber]);

  const callMember = useCallback(() => {
    const phone = member?.phone?.replace(/\s/g, '');
    if (!phone) {
      Alert.alert('No phone', 'Phone is not on the membership list API yet.');
      return;
    }
    void Linking.openURL(`tel:${phone}`);
  }, [member?.phone]);

  const emailMember = useCallback(() => {
    const email = member?.email?.trim();
    if (!email) {
      Alert.alert('No email', 'This member has no email on file.');
      return;
    }
    void Linking.openURL(`mailto:${email}`);
  }, [member?.email]);

  if (!uid) {
    return (
      <View style={[styles.centered, { backgroundColor: c.surfaceMuted }]}>
        <Text style={{ color: c.ink700 }}>Missing member id.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={adminScrollContentInsets(insets.bottom)}
      refreshControl={
        <RefreshControl refreshing={revalidating} onRefresh={() => setRefreshKey((k) => k + 1)} tintColor={c.azure500} />
      }
      showsVerticalScrollIndicator={false}
    >
      <AdminPageHeader
        eyebrow="member"
        title={member?.name ?? 'Member'}
        description={
          member
            ? `${deviceUserIdInlineLabel(member.libraryNumber)} · ${member.plan === 'account' ? 'Account only' : planName(lib, member.plan)}`
            : 'Loading…'
        }
      />

      {loading && !member ? <ActivityIndicator color={c.azure500} style={{ marginVertical: 24 }} /> : null}
      {err ? <Text style={[styles.err, { color: c.azure700 }]}>{err}</Text> : null}

      {member ? (
        <>
          <AdminKeyValueGroup
            rows={[
              { label: 'Seat', value: member.seatNo },
              {
                label: 'Plan',
                value: member.plan === 'account' ? '—' : membershipPlanKindLabel(member.planKind),
              },
              { label: 'Window', value: member.windowLabel },
              {
                label: 'Status',
                value: <MembershipStatusBadge member={member} align="start" />,
              },
              { label: 'KYC', value: verificationStatusLabel(member.verificationStatus) },
            ]}
          />

          <View style={styles.contactRow}>
            <Button title="Call" variant="secondary" onPress={callMember} style={styles.contactBtn} />
            <Button title="Email" variant="secondary" onPress={emailMember} style={styles.contactBtn} />
          </View>

          {member.verificationStatus.toLowerCase() === 'pending' ? (
            <AdminSectionCard title="Documents" description="KYC pending review." paddedBody={false}>
              <AdminListRow
                title="Review documents"
                onPress={() => router.push(`/(admin)/docs?focus=${encodeURIComponent(member.userId)}`)}
                last
              />
            </AdminSectionCard>
          ) : null}

          <Text style={[styles.enrollHint, { color: c.ink500 }]}>
            To add a new member or renew a plan, go to Members → Add.
          </Text>

          <AdminSectionCard title="Payments" description="Latest charges." paddedBody={false}>
            {payments.length === 0 ? (
              <Text style={[styles.emptyInline, { color: c.ink500 }]}>No payment rows.</Text>
            ) : (
              payments.map((p, i) => (
                <AdminListRow
                  key={p.id}
                  last={i === payments.length - 1}
                  title={`₹${Number(p.amountRupees).toLocaleString('en-IN')}`}
                  subtitle={formatDateTimeShort(p.createdAt)}
                  right={
                    <StatusBadge tone={adminPaymentStatusTone(p.status)} label={adminPaymentStatusLabel(p.status)} />
                  }
                  showChevron={false}
                />
              ))
            )}
          </AdminSectionCard>

          <AdminSectionCard title="Attendance · 7 days" paddedBody={false}>
            {attendanceLoading ? <ActivityIndicator color={c.azure500} style={{ margin: 16 }} /> : null}
            {!attendanceLoading && attendance.length === 0 ? (
              <Text style={[styles.emptyInline, { color: c.ink500 }]}>No punches in the last 7 days.</Text>
            ) : !attendanceLoading ? (
              attendance.map((r, i) => (
                <AdminListRow
                  key={`${r.Empcode}-${r.DateString}`}
                  last={i === attendance.length - 1}
                  title={r.DateString}
                  subtitle={`In ${r.INTime} · Out ${r.OUTTime}`}
                  right={
                    <StatusBadge
                      tone={r.Status === 'P' ? 'azure' : r.Status === 'A' ? 'danger' : 'warn'}
                      label={statusLabel(r.Status)}
                      dot
                    />
                  }
                  showChevron={false}
                />
              ))
            ) : null}
          </AdminSectionCard>

          <Text style={[styles.footMeta, { color: c.ink500 }]}>
            Joined {formatDate(member.joinDate)}
            {member.expiryDate ? ` · ends ${formatDate(member.expiryDate)}` : ''}
          </Text>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  err: { marginBottom: 12, fontSize: 15, fontWeight: '500' },
  contactRow: { flexDirection: 'row', gap: 10 },
  contactBtn: { flex: 1 },
  enrollHint: { fontSize: 14, lineHeight: 20, fontWeight: '500', marginBottom: 4 },
  emptyInline: { padding: 20, fontSize: 15 },
  footMeta: { fontSize: 13, fontWeight: '500', textAlign: 'center', marginTop: 8 },
});

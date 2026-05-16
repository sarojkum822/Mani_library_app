import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
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
import { api, type AdminPaymentListRow } from '@/lib/api';
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

  const [member, setMember] = useState<Member | null>(null);
  const [payments, setPayments] = useState<AdminPaymentListRow[]>([]);
  const [attendance, setAttendance] = useState<PunchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const uid = typeof userId === 'string' ? userId : '';

  const load = useCallback(async () => {
    if (!token || !uid) {
      setMember(null);
      setErr('Sign in as admin.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const [members, payPayload] = await Promise.all([
        api.adminMembersList(token),
        api.adminPaymentsList(token),
      ]);
      const m =
        members.find((row) => row.userId === uid) ??
        members.find((row) => row.listKey === `account:${uid}`) ??
        null;
      setMember(m);
      setPayments(payPayload.rows.filter((r) => r.userId === uid).slice(0, 12));

      if (m?.libraryNumber) {
        const to = todayIsoYmd();
        const from = addDaysIsoYmd(to, -6);
        const punches = await api.adminDailyAttendance(token, {
          fromDate: isoToDMY(from),
          toDate: isoToDMY(to),
          empcode: deviceUserIdToEmpcode(m.libraryNumber),
        });
        setAttendance(sortRecords(punches));
      } else {
        setAttendance([]);
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Could not load member.');
      setMember(null);
      setPayments([]);
      setAttendance([]);
    } finally {
      setLoading(false);
    }
  }, [token, uid]);

  useEffect(() => {
    void load();
  }, [load]);

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
      style={[styles.root, { backgroundColor: c.surfaceMuted }]}
      contentContainerStyle={adminScrollContentInsets(insets.bottom)}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={c.azure500} />}
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
            {attendance.length === 0 ? (
              <Text style={[styles.emptyInline, { color: c.ink500 }]}>No punches in the last 7 days.</Text>
            ) : (
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
            )}
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

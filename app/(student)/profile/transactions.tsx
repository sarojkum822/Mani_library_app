import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CLARITY_MONO } from '@/components/admin/clarityTokens';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/components/auth/AuthProvider';
import { useMemberPrefetch } from '@/components/member/MemberPrefetchProvider';
import { Card } from '@/components/ui/Card';
import { StatusBadge, type StatusTone } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { api, type MembershipHistoryEntry } from '@/lib/api';

function formatHistoryDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function historyStatusTone(status: MembershipHistoryEntry['status']): StatusTone {
  if (status === 'paid') return 'success';
  if (status === 'pending') return 'warning';
  if (status === 'failed') return 'danger';
  return 'neutral';
}

function historyStatusLabel(status: MembershipHistoryEntry['status']): string {
  if (status === 'paid') return 'Paid';
  if (status === 'pending') return 'Pending';
  if (status === 'failed') return 'Failed';
  return 'Refunded';
}

export default function TransactionHistoryScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();
  const { auth } = useAuth();
  const mp = useMemberPrefetch();
  const token = auth.status === 'signed_in' ? auth.token : null;
  const isStudent = auth.status === 'signed_in' && auth.user.role === 'student';

  const [nonStudentRows, setNonStudentRows] = useState<MembershipHistoryEntry[] | null>(null);
  const [nonStudentLoading, setNonStudentLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token || isStudent) {
        setNonStudentRows(null);
        setNonStudentLoading(false);
        return;
      }
      setNonStudentLoading(true);
      try {
        const list = await api.membershipHistory(token);
        if (!cancelled) setNonStudentRows(list);
      } catch {
        if (!cancelled) setNonStudentRows([]);
      } finally {
        if (!cancelled) setNonStudentLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, isStudent]);

  const loading = isStudent ? !mp.accountReady : nonStudentLoading;
  const rows = isStudent ? mp.payments : nonStudentRows;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.surfaceMuted }}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: Math.max(insets.bottom, 20) + 24,
      }}
      keyboardShouldPersistTaps="handled"
    >
      {isStudent && mp.prefetchError ? (
        <Card style={{ padding: 14, marginBottom: 12, gap: 8 }}>
          <Text style={{ color: c.ink700, fontSize: 15, lineHeight: 22 }}>{mp.prefetchError}</Text>
          <Button title="Try again" variant="secondary" onPress={() => void mp.refetch()} />
        </Card>
      ) : null}

      <Card style={{ padding: 16, marginTop: 14 }}>
        {loading ? (
          <View style={{ paddingVertical: 32, alignItems: 'center' }}>
            <ActivityIndicator color={c.azure500} />
            <Text style={{ color: c.ink500, fontSize: 14, marginTop: 12 }}>Loading payments…</Text>
          </View>
        ) : !rows || rows.length === 0 ? (
          <Text style={{ color: c.ink500, fontSize: 15, lineHeight: 22, fontWeight: '400' }}>
            No transactions yet.
          </Text>
        ) : (
          <View style={{ gap: 0 }}>
            {rows.map((entry, index) => {
              const muted = index > 0;
              const dateC = muted ? c.ink400 : c.ink600;
              const titleC = muted ? c.ink500 : c.ink900;
              const metaC = muted ? c.ink400 : c.ink600;
              const amtC = muted ? c.ink500 : c.ink900;
              const periodC = muted ? c.ink400 : c.ink500;
              const receiptC = muted ? c.ink300 : c.ink400;
              return (
                <View
                  key={entry.id}
                  style={[
                    styles.row,
                    { borderBottomColor: c.border, opacity: muted ? 0.85 : 1 },
                    index === rows.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <View style={styles.rowTop}>
                    <Text style={[styles.date, { color: dateC, fontWeight: muted ? '500' : '600' }]}>
                      {formatHistoryDate(entry.occurredAt)}
                    </Text>
                    <StatusBadge tone={historyStatusTone(entry.status)} label={historyStatusLabel(entry.status)} />
                  </View>
                  <Text style={[styles.title, { color: titleC, fontWeight: muted ? '500' : '600' }]}>{entry.title}</Text>
                  <View style={styles.meta}>
                    {entry.planName ? (
                      <Text style={[styles.metaText, { color: metaC }]}>{entry.planName}</Text>
                    ) : null}
                    {entry.amount ? (
                      <Text style={[styles.amount, { color: amtC, fontWeight: muted ? '600' : '700' }]}>{entry.amount}</Text>
                    ) : null}
                  </View>
                  {entry.periodLabel ? (
                    <Text style={[styles.period, { color: periodC }]}>{entry.periodLabel}</Text>
                  ) : null}
                  {entry.receiptId ? (
                    <Text style={[styles.receipt, { color: receiptC }]} selectable>
                      Receipt · {entry.receiptId}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  date: { fontSize: 13, fontWeight: '500' },
  title: { marginTop: 8, fontSize: 17, fontWeight: '600', letterSpacing: -0.3 },
  meta: { marginTop: 6, flexDirection: 'column', alignItems: 'flex-start', gap: 4 },
  metaText: { fontSize: 15, fontWeight: '400' },
  amount: { fontSize: 17, fontWeight: '600' },
  period: { marginTop: 4, fontSize: 13, fontWeight: '400' },
  receipt: { marginTop: 8, ...CLARITY_MONO, fontSize: 12 },
});

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PaymentHistoryList } from '@/components/student/PaymentHistoryList';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/components/auth/AuthProvider';
import { useMemberPrefetch } from '@/components/member/MemberPrefetchProvider';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api, type MembershipHistoryEntry } from '@/lib/api';

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

  const loading = isStudent ? mp.loading : nonStudentLoading;
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

      <Card style={{ padding: 0, overflow: 'hidden', marginTop: 14 }}>
        {loading ? (
          <View style={{ paddingVertical: 32, alignItems: 'center' }}>
            <ActivityIndicator color={c.azure500} />
            <Text style={{ color: c.ink500, fontSize: 14, marginTop: 12 }}>Loading payments…</Text>
          </View>
        ) : !rows || rows.length === 0 ? (
          <Text style={{ color: c.ink500, fontSize: 15, lineHeight: 22, fontWeight: '400', padding: 16 }}>
            No transactions yet.
          </Text>
        ) : (
          <PaymentHistoryList rows={rows} />
        )}
      </Card>
    </ScrollView>
  );
}

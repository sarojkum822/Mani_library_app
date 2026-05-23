import React, { useCallback, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdminAvatar } from '@/components/admin/AdminAvatar';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { AdminListRow } from '@/components/admin/AdminListRow';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { adminCardChrome, CLARITY_BODY_SM } from '@/components/admin/clarityTokens';
import { adminScrollContentInsets } from '@/components/admin/layoutTokens';
import { useAuth } from '@/components/auth/AuthProvider';
import { StatusBadge } from '@/components/ui/StatusBadge';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useStaleWhileRevalidate } from '@/hooks/useStaleWhileRevalidate';
import { api, type AdminFeedbackRow } from '@/lib/api';
import { cacheKeys } from '@/lib/dataCache';

export default function AdminFeedbackScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();
  const { auth } = useAuth();
  const token = auth.status === 'signed_in' ? auth.token : null;
  const [refreshKey, setRefreshKey] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    if (!token) throw new Error('Sign in as admin.');
    return api.adminFeedbackList(token);
  }, [token]);

  const { data, loading, revalidating, error } = useStaleWhileRevalidate<AdminFeedbackRow[]>({
    cacheKey: cacheKeys.adminFeedback,
    fetcher: fetchList,
    refreshKey,
    enabled: !!token,
  });

  const rows = data ?? [];

  const toggleApprove = (row: AdminFeedbackRow) => {
    if (!token) return;
    const next = !row.approved;
    Alert.alert(next ? 'Approve for homepage?' : 'Remove from homepage?', row.comment.slice(0, 120), [
      { text: 'Cancel', style: 'cancel' },
      {
        text: next ? 'Approve' : 'Unapprove',
        onPress: async () => {
          setBusyId(row.userId);
          try {
            await api.adminFeedbackApprove(token, row.userId, next);
            setRefreshKey((k) => k + 1);
          } catch (e: unknown) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Could not update.');
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  return (
    <FlatList
      style={{ flex: 1 }}
      contentContainerStyle={adminScrollContentInsets(insets.bottom)}
      data={rows}
      keyExtractor={(item) => item.userId}
      refreshControl={
        <RefreshControl refreshing={revalidating} onRefresh={() => setRefreshKey((k) => k + 1)} />
      }
      ListHeaderComponent={
        <View style={{ paddingBottom: 12, gap: 10 }}>
          <AdminPageHeader
            eyebrow="members"
            title="Member feedback"
            description="Approve ratings to show on the public homepage testimonials."
          />
          {error ? (
            <AdminEmptyState title="Could not load" body={error} actionLabel="Retry" onAction={() => setRefreshKey((k) => k + 1)} />
          ) : null}
        </View>
      }
      ListEmptyComponent={
        loading ? null : (
          <AdminEmptyState title="No feedback yet" body="Members submit feedback from their profile after verification." />
        )
      }
      renderItem={({ item }) => {
        const idLabel =
          item.deviceUserId != null ? String(item.deviceUserId).padStart(4, '0') : '—';
        return (
          <View style={[styles.card, adminCardChrome(c)]}>
            <AdminListRow
              left={<AdminAvatar name={item.fullName} small />}
              title={item.fullName}
              subtitle={`★ ${item.rating} · ID ${idLabel}${item.email ? ` · ${item.email}` : ''}`}
              right={
                <StatusBadge
                  tone={item.approved ? 'success' : 'warning'}
                  label={item.approved ? 'Live' : 'Pending'}
                />
              }
              showChevron={false}
              onPress={() => toggleApprove(item)}
              last
            />
            <Text style={[styles.comment, CLARITY_BODY_SM, { color: c.ink800 }]}>{item.comment}</Text>
            <Text style={[styles.action, { color: busyId === item.userId ? c.ink400 : c.azure600 }]}>
              {busyId === item.userId ? 'Updating…' : item.approved ? 'Tap to unapprove' : 'Tap to approve'}
            </Text>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 10, overflow: 'hidden' },
  comment: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    lineHeight: 21,
  },
  action: { fontSize: 12, fontWeight: '600', paddingHorizontal: 14, paddingBottom: 12 },
});

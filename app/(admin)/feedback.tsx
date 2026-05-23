import React, { useCallback, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { AdminFeedbackCard } from '@/components/admin/AdminFeedbackCard';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { adminScrollContentInsets } from '@/components/admin/layoutTokens';
import { useAuth } from '@/components/auth/AuthProvider';
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

  const setApproved = async (row: AdminFeedbackRow, approved: boolean) => {
    if (!token) return;
    setBusyId(row.userId);
    try {
      await api.adminFeedbackApprove(token, row.userId, approved);
      setRefreshKey((k) => k + 1);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not update.');
    } finally {
      setBusyId(null);
    }
  };

  const onApprove = (row: AdminFeedbackRow) => {
    Alert.alert('Approve for homepage?', 'This testimonial will appear on the public site.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Approve', onPress: () => void setApproved(row, true) },
    ]);
  };

  const onDismiss = (row: AdminFeedbackRow) => {
    if (row.approved) {
      Alert.alert('Remove from homepage?', 'Members will no longer see this on the landing page.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Unapprove', onPress: () => void setApproved(row, false) },
      ]);
      return;
    }
    // Pending: no API change — acknowledge only
  };

  return (
    <FlatList
      style={{ flex: 1 }}
      contentContainerStyle={adminScrollContentInsets(insets.bottom)}
      data={rows}
      keyExtractor={(item) => item.userId}
      refreshControl={
        <RefreshControl refreshing={revalidating} onRefresh={() => setRefreshKey((k) => k + 1)} tintColor={c.azure500} />
      }
      ListHeaderComponent={
        <View style={{ paddingBottom: 12, gap: 10 }}>
          <AdminPageHeader
            eyebrow="members"
            title="Member feedback"
            description="Review ratings and comments. Approved feedback appears in homepage testimonials."
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
      renderItem={({ item }) => (
        <AdminFeedbackCard
          row={item}
          busy={busyId === item.userId}
          onApprove={() => onApprove(item)}
          onDismiss={() => onDismiss(item)}
          style={styles.cardGap}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  cardGap: { marginBottom: 16 },
});

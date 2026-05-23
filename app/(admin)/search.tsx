import { router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdminAvatar } from '@/components/admin/AdminAvatar';
import { AdminListRow } from '@/components/admin/AdminListRow';
import { AdminListSkeleton } from '@/components/admin/AdminListSkeleton';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminSearchField } from '@/components/admin/AdminSearchField';
import { adminCardChrome } from '@/components/admin/clarityTokens';
import { adminScrollContentInsets } from '@/components/admin/layoutTokens';
import { useAuth } from '@/components/auth/AuthProvider';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { MembershipStatusBadge } from '@/components/admin/MembershipStatusBadge';
import { useStaleWhileRevalidate } from '@/hooks/useStaleWhileRevalidate';
import { DEVICE_USER_ID_SEARCH_PLACEHOLDER, deviceUserIdInlineLabel } from '@/lib/deviceUserIdLabel';
import { api } from '@/lib/api';
import { cacheKeys } from '@/lib/dataCache';
import { membershipPlanKindLabel, type Member } from '@/lib/members';

export default function AdminSearchScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();
  const { auth } = useAuth();
  const token = auth.status === 'signed_in' ? auth.token : null;

  const [refreshKey, setRefreshKey] = useState(0);
  const [q, setQ] = useState('');

  const fetchMembers = useCallback(async () => {
    if (!token) throw new Error('Sign in as admin to load members.');
    return api.adminMembersList(token);
  }, [token]);

  const { data, loading, revalidating } = useStaleWhileRevalidate<Member[]>({
    cacheKey: cacheKeys.adminMembers,
    fetcher: fetchMembers,
    refreshKey,
    enabled: !!token,
  });

  const all = data ?? [];
  const listLoading = loading && all.length === 0;

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return all.slice(0, 40);
    return all.filter(
      (m) =>
        m.name.toLowerCase().includes(t) ||
        m.id.toLowerCase().includes(t) ||
        m.libraryNumber.toLowerCase().includes(t) ||
        m.listKey.toLowerCase().includes(t) ||
        m.email.toLowerCase().includes(t) ||
        m.phone.replace(/\s/g, '').includes(t),
    );
  }, [all, q]);

  return (
    <View style={styles.root}>
      <FlatList
        data={filtered}
        keyExtractor={(m) => m.listKey}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={revalidating}
            onRefresh={() => setRefreshKey((k) => k + 1)}
            tintColor={c.azure500}
          />
        }
        contentContainerStyle={[adminScrollContentInsets(insets.bottom, 12), { flexGrow: 1 }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ paddingBottom: 14, gap: 12 }}>
            <AdminPageHeader
              eyebrow="search"
              title="Search"
              description="Find members by name, device user id, email, or phone."
            />
            <AdminSearchField
              value={q}
              onChangeText={setQ}
              placeholder={`Name, ${DEVICE_USER_ID_SEARCH_PLACEHOLDER}`}
              autoFocus
              autoCapitalize="none"
            />
            {listLoading ? <AdminListSkeleton rows={6} /> : null}
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, adminCardChrome(c)]}>
            <AdminListRow
              last
              left={<AdminAvatar name={item.name} />}
              title={item.name}
              subtitle={`${deviceUserIdInlineLabel(item.libraryNumber)} · ${
                item.plan === 'account' ? 'Account' : membershipPlanKindLabel(item.planKind)
              } · Seat ${item.seatNo}`}
              right={<MembershipStatusBadge member={item} />}
              onPress={() => router.push(`/(admin)/member/${encodeURIComponent(item.userId)}`)}
            />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  card: {
    marginBottom: 12,
    overflow: 'hidden',
  },
});

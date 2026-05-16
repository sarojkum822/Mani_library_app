import { router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CreateMemberSheet } from '@/components/admin/CreateMemberSheet';
import { RenewMemberSheet } from '@/components/admin/RenewMemberSheet';
import { AdminAvatar } from '@/components/admin/AdminAvatar';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { AdminListRow } from '@/components/admin/AdminListRow';
import { AdminListSkeleton } from '@/components/admin/AdminListSkeleton';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminSearchField } from '@/components/admin/AdminSearchField';
import { AdminSegmentedControl, type AdminSegment } from '@/components/admin/AdminSegmentedControl';
import { adminScrollContentInsets } from '@/components/admin/layoutTokens';
import { useAuth } from '@/components/auth/AuthProvider';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { MembershipStatusBadge } from '@/components/admin/MembershipStatusBadge';
import { useStaleWhileRevalidate } from '@/hooks/useStaleWhileRevalidate';
import { api } from '@/lib/api';
import { cacheKeys } from '@/lib/dataCache';
import { DEVICE_USER_ID_SEARCH_PLACEHOLDER, deviceUserIdInlineLabel } from '@/lib/deviceUserIdLabel';
import {
  isMemberCurrentlyActive,
  membershipPlanKindLabel,
  type Member,
} from '@/lib/members';
import { isEndedSubscription } from '@/lib/membershipSubscriptionClassify';

type MemberFilter = 'all' | 'active' | 'expired' | 'kyc';

const SEGMENTS: AdminSegment<MemberFilter>[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'expired', label: 'Ended' },
  { id: 'kyc', label: 'KYC pending' },
];

export default function AdminMembersScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();
  const { auth } = useAuth();
  const token = auth.status === 'signed_in' ? auth.token : null;

  const [refreshKey, setRefreshKey] = useState(0);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<MemberFilter>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);

  const fetchMembers = useCallback(async () => {
    if (!token) throw new Error('Sign in as admin to load members.');
    return api.adminMembersList(token);
  }, [token]);

  const { data, loading, revalidating, error } = useStaleWhileRevalidate<Member[]>({
    cacheKey: cacheKeys.adminMembers,
    fetcher: fetchMembers,
    refreshKey,
    enabled: !!token,
  });

  const members = data ?? [];

  const openAddChooser = useCallback(() => {
    Alert.alert('Add membership', 'Create a new login or renew an existing member.', [
      { text: 'New member', onPress: () => setCreateOpen(true) },
      { text: 'Renew member', onPress: () => setRenewOpen(true) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, []);

  const bumpRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const counts = useMemo(() => {
    const active = members.filter(isMemberCurrentlyActive).length;
    const expired = members.filter(isEndedSubscription).length;
    const kyc = members.filter((m) => m.verificationStatus.toLowerCase() === 'pending').length;
    return { all: members.length, active, expired, kyc };
  }, [members]);

  const segments = useMemo(
    () =>
      SEGMENTS.map((s) => ({
        ...s,
        count: counts[s.id],
      })),
    [counts],
  );

  const filtered = useMemo(() => {
    let list = members;
    if (filter === 'active') list = list.filter(isMemberCurrentlyActive);
    else if (filter === 'expired') list = list.filter(isEndedSubscription);
    else if (filter === 'kyc') list = list.filter((m) => m.verificationStatus.toLowerCase() === 'pending');

    const t = query.trim().toLowerCase();
    if (!t) return list;
    return list.filter(
      (m) =>
        m.name.toLowerCase().includes(t) ||
        m.libraryNumber.toLowerCase().includes(t) ||
        m.email.toLowerCase().includes(t) ||
        m.phone.replace(/\s/g, '').includes(t),
    );
  }, [members, filter, query]);

  const ListHeader = useCallback(
    () => (
      <View style={{ paddingBottom: 12, gap: 12 }}>
        <AdminPageHeader
          eyebrow="members"
          title="Members"
          description="Tap a row for profile · use Add for new member or renewal."
          actions={
            <View style={styles.headerActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Search members"
                onPress={() => router.push('/(admin)/search')}
                style={({ pressed }) => [
                  styles.secondaryBtn,
                  { borderColor: c.border, backgroundColor: c.surface },
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Text style={[styles.secondaryBtnText, { color: c.ink800 }]}>Search</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Create member"
                onPress={openAddChooser}
                style={({ pressed }) => [
                  styles.addBtn,
                  { backgroundColor: c.azure500, minHeight: 44 },
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Text style={styles.addBtnText}>Add</Text>
              </Pressable>
            </View>
          }
        />
        <AdminSearchField
          value={query}
          onChangeText={setQuery}
          placeholder={`Search name, ${DEVICE_USER_ID_SEARCH_PLACEHOLDER}`}
        />
        <AdminSegmentedControl segments={segments} value={filter} onChange={setFilter} />
        {revalidating ? (
          <Text style={{ color: c.ink500, fontSize: 11, fontWeight: '600', textAlign: 'right' }}>Updating…</Text>
        ) : null}
        {error && !data ? (
          <AdminEmptyState title="Could not load" body={error} actionLabel="Retry" onAction={bumpRefresh} />
        ) : null}
        {loading && members.length === 0 ? <AdminListSkeleton rows={8} /> : null}
      </View>
    ),
    [
      bumpRefresh,
      c.azure500,
      c.border,
      c.ink500,
      c.ink800,
      c.surface,
      data,
      error,
      filter,
      loading,
      members.length,
      openAddChooser,
      query,
      revalidating,
      segments,
    ],
  );

  return (
    <View style={[styles.root, { backgroundColor: c.surfaceMuted }]}>
      {token ? (
        <>
          <CreateMemberSheet
            visible={createOpen}
            token={token}
            onClose={() => setCreateOpen(false)}
            onSuccess={(result) => {
              bumpRefresh();
              router.push(`/(admin)/member/${encodeURIComponent(result.user_id)}`);
            }}
          />
          <RenewMemberSheet
            visible={renewOpen}
            token={token}
            onClose={() => setRenewOpen(false)}
            onSuccess={(result) => {
              bumpRefresh();
              router.push(`/(admin)/member/${encodeURIComponent(result.user_id)}`);
            }}
          />
        </>
      ) : null}
      <FlatList
        data={filtered}
        keyExtractor={(m) => m.listKey}
        ListHeaderComponent={ListHeader}
        refreshControl={
          <RefreshControl
            refreshing={loading && members.length > 0}
            onRefresh={bumpRefresh}
            tintColor={c.azure500}
          />
        }
        contentContainerStyle={[adminScrollContentInsets(insets.bottom, 14), styles.listPad]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <AdminListRow
              last
              left={<AdminAvatar name={item.name} />}
              title={item.name}
              subtitle={`${deviceUserIdInlineLabel(item.libraryNumber)} · ${
                item.plan === 'account' ? 'Account' : membershipPlanKindLabel(item.planKind)
              } · Seat ${item.seatNo}`}
              right={<MembershipStatusBadge member={item} />}
              onPress={() => router.push(`/(admin)/member/${encodeURIComponent(item.userId)}`)}
              style={index === 0 ? undefined : { borderTopWidth: 0 }}
            />
          </View>
        )}
        ListEmptyComponent={
          !loading && !error ? (
            <AdminEmptyState
              title="No members"
              body={query.trim() ? 'Try a different search.' : 'Pull down to refresh.'}
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
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
    overflow: 'hidden',
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  secondaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
    justifyContent: 'center',
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '600' },
  addBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    justifyContent: 'center',
    minWidth: 64,
  },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

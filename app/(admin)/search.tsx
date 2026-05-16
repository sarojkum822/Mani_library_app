import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdminAvatar } from '@/components/admin/AdminAvatar';
import { AdminListRow } from '@/components/admin/AdminListRow';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminSearchField } from '@/components/admin/AdminSearchField';
import { adminCardChrome } from '@/components/admin/clarityTokens';
import { adminScrollContentInsets } from '@/components/admin/layoutTokens';
import { useAuth } from '@/components/auth/AuthProvider';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { MembershipStatusBadge } from '@/components/admin/MembershipStatusBadge';
import { DEVICE_USER_ID_SEARCH_PLACEHOLDER, deviceUserIdInlineLabel } from '@/lib/deviceUserIdLabel';
import { api } from '@/lib/api';
import {
  membershipPlanKindLabel,
  type Member,
} from '@/lib/members';

export default function AdminSearchScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();
  const { auth } = useAuth();
  const token = auth.status === 'signed_in' ? auth.token : null;

  const [all, setAll] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    if (!token) {
      setAll([]);
      return;
    }
    setLoading(true);
    try {
      setAll(await api.adminMembersList(token));
    } catch {
      setAll([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

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
    <View style={[styles.root, { backgroundColor: c.surfaceMuted }]}>
      <FlatList
        data={filtered}
        keyExtractor={(m) => m.listKey}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={c.azure500} />}
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
            {loading && all.length === 0 ? <ActivityIndicator color={c.azure500} style={{ marginTop: 8 }} /> : null}
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

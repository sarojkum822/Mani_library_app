import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdminAvatar } from '@/components/admin/AdminAvatar';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { AdminListRow } from '@/components/admin/AdminListRow';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminSectionCard } from '@/components/admin/AdminSectionCard';
import { AdminSegmentedControl, type AdminSegment } from '@/components/admin/AdminSegmentedControl';
import { ADMIN_GROUP_RADIUS, adminScrollContentInsets } from '@/components/admin/layoutTokens';
import { useAuth } from '@/components/auth/AuthProvider';
import { useLibraryInfo } from '@/components/library/LibraryInfoProvider';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { MembershipStatusBadge } from '@/components/admin/MembershipStatusBadge';
import { api } from '@/lib/api';
import { deviceUserIdInlineLabel } from '@/lib/deviceUserIdLabel';
import {
  daysUntil,
  formatCurrency,
  formatDate,
  membershipStatusDisplayLabel,
  type Member,
} from '@/lib/members';
import {
  isEndedSubscription,
  isExpiringWithin7Days,
  isRenewalWindow8to30Days,
} from '@/lib/membershipSubscriptionClassify';

type SubTab = 'expiring' | 'upcoming' | 'expired';

const TABS: AdminSegment<SubTab>[] = [
  { id: 'expiring', label: '≤7 days' },
  { id: 'upcoming', label: '8–30 days' },
  { id: 'expired', label: 'Ended' },
];

export default function AdminSubscriptionsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();
  const lib = useLibraryInfo();
  const { auth } = useAuth();
  const token = auth.status === 'signed_in' ? auth.token : null;

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<SubTab>('expiring');

  const load = useCallback(async () => {
    if (!token) {
      setMembers([]);
      return;
    }
    setLoading(true);
    try {
      setMembers(await api.adminMembersList(token));
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const planDistribution = useMemo(
    () =>
      lib.plans.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        count: members.filter((m) => m.plan === p.id).length,
      })),
    [members, lib.plans],
  );

  const expired = useMemo(
    () => members.filter(isEndedSubscription).sort((a, b) => daysUntil(a.expiryDate) - daysUntil(b.expiryDate)),
    [members],
  );
  const expiringSoon = useMemo(
    () =>
      members
        .filter((m) => isExpiringWithin7Days(m))
        .sort((a, b) => daysUntil(a.expiryDate) - daysUntil(b.expiryDate)),
    [members],
  );

  const upcoming = useMemo(
    () =>
      members
        .filter((m) => isRenewalWindow8to30Days(m))
        .sort((a, b) => daysUntil(a.expiryDate) - daysUntil(b.expiryDate)),
    [members],
  );

  const list = tab === 'expiring' ? expiringSoon : tab === 'upcoming' ? upcoming : expired.slice(0, 50);
  const counts = { expiring: expiringSoon.length, upcoming: upcoming.length, expired: expired.length };
  const segments = TABS.map((t) => ({ ...t, count: counts[t.id] }));

  const tabTitle =
    tab === 'expiring' ? 'Expiring in 7 days' : tab === 'upcoming' ? 'Renewals in 8–30 days' : 'Ended memberships';

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: c.surfaceMuted }]}
      contentContainerStyle={adminScrollContentInsets(insets.bottom)}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={c.azure500} />}
    >
      <AdminPageHeader
        eyebrow="subscriptions"
        title="Subscriptions"
        description="Renewal windows and plan counts from your live roster."
      />
      {loading && members.length === 0 ? (
        <View style={{ paddingVertical: 16 }}>
          <ActivityIndicator color={c.azure500} />
        </View>
      ) : null}

      <View style={styles.planGrid}>
        {planDistribution.map((p) => {
          const total = members.length;
          const pct = total === 0 ? 0 : Math.round((p.count / total) * 100);
          return (
            <View
              key={p.id}
              style={[styles.planCard, { borderColor: c.border, backgroundColor: c.surface, borderRadius: ADMIN_GROUP_RADIUS }]}
            >
              <Text style={[styles.planLabel, { color: c.ink500 }]}>{p.name}</Text>
              <Text style={[styles.planValue, { color: c.ink900 }]}>{p.count}</Text>
              <Text style={[styles.planHint, { color: c.ink500 }]}>
                {formatCurrency(lib, p.price)}/mo · {pct}%
              </Text>
              <View style={[styles.planTrack, { backgroundColor: c.ink100 }]}>
                <View style={[styles.planFill, { width: `${pct}%`, backgroundColor: c.azure500 }]} />
              </View>
            </View>
          );
        })}
      </View>

      <AdminSegmentedControl segments={segments} value={tab} onChange={setTab} />

      <AdminSectionCard title={tabTitle} paddedBody={false}>
        {list.length === 0 ? (
          <AdminEmptyState title="None in this list" body="Pull down to refresh the roster." />
        ) : (
          list.map((m, i) => {
            const d = daysUntil(m.expiryDate);
            const dayHint =
              tab === 'expired'
                ? membershipStatusDisplayLabel(m)
                : d <= 0
                  ? 'Ends today'
                  : `Ends ${formatDate(m.expiryDate)}`;
            return (
              <AdminListRow
                key={m.listKey}
                last={i === list.length - 1}
                left={<AdminAvatar name={m.name} small />}
                title={m.name}
                subtitle={`${deviceUserIdInlineLabel(m.libraryNumber)} · Seat ${m.seatNo} · ${dayHint}`}
                right={<MembershipStatusBadge member={m} />}
                onPress={() => router.push(`/(admin)/member/${encodeURIComponent(m.userId)}`)}
              />
            );
          })
        )}
      </AdminSectionCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  planGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  planCard: { flexGrow: 1, flexBasis: '45%', borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 4 },
  planLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  planValue: { fontSize: 24, fontWeight: '700', fontVariant: ['tabular-nums'] },
  planHint: { fontSize: 13, fontWeight: '500' },
  planTrack: { marginTop: 8, height: 4, borderRadius: 999, overflow: 'hidden' },
  planFill: { height: '100%', borderRadius: 999 },
});

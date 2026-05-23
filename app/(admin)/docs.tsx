import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useStaleWhileRevalidate } from '@/hooks/useStaleWhileRevalidate';
import { cacheKeys } from '@/lib/dataCache';
import {
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminSearchField } from '@/components/admin/AdminSearchField';
import { ADMIN_GROUP_RADIUS, adminScrollContentInsets } from '@/components/admin/layoutTokens';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/components/auth/AuthProvider';
import { api, type AdminKycDocument, type AdminPendingKycMember } from '@/lib/api';

export default function AdminDocsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();
  const { auth } = useAuth();
  const token = auth.status === 'signed_in' ? auth.token : null;
  const { focus } = useLocalSearchParams<{ focus?: string }>();

  const [refreshKey, setRefreshKey] = useState(0);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [docs, setDocs] = useState<AdminKycDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [memberNote, setMemberNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const fetchPending = useCallback(async () => {
    if (!token) throw new Error('Sign in as admin.');
    return api.adminPendingKycMembers(token);
  }, [token]);

  const { data: items, loading, revalidating } = useStaleWhileRevalidate<AdminPendingKycMember[]>({
    cacheKey: cacheKeys.adminPendingKyc,
    fetcher: fetchPending,
    refreshKey,
    enabled: !!token,
  });

  const itemsList = items ?? [];

  useEffect(() => {
    const focusId = typeof focus === 'string' ? focus : '';
    if (focusId && itemsList.some((p) => p.userId === focusId)) {
      setExpandedUserId(focusId);
    }
  }, [focus, itemsList]);

  useEffect(() => {
    if (!token || !expandedUserId) {
      setDocs([]);
      return;
    }
    let cancelled = false;
    setDocsLoading(true);
    void (async () => {
      try {
        const list = await api.adminMemberKycDocuments(token, expandedUserId);
        if (!cancelled) setDocs(list);
      } catch {
        if (!cancelled) setDocs([]);
      } finally {
        if (!cancelled) setDocsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, expandedUserId]);

  async function approve(userId: string) {
    if (!token) return;
    setBusy(`${userId}:approve`);
    try {
      await api.adminVerifyProfile(token, userId);
      setRefreshKey((k) => k + 1);
      if (expandedUserId === userId) setExpandedUserId(null);
    } catch (e: unknown) {
      Alert.alert('Approve failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(null);
    }
  }

  async function respond(userId: string, action: 'reject' | 'request_resubmit') {
    if (!token) return;
    const trimmed = memberNote.trim();
    if (action === 'request_resubmit' && trimmed.length < 3) {
      Alert.alert('Note required', 'Add a short note for the member (at least 3 characters).');
      return;
    }
    setBusy(`${userId}:${action}`);
    try {
      await api.adminVerificationRespond(token, {
        userId,
        action,
        studentMessage: trimmed.length ? trimmed : undefined,
      });
      setMemberNote('');
      setRefreshKey((k) => k + 1);
      if (expandedUserId === userId) setExpandedUserId(null);
    } catch (e: unknown) {
      Alert.alert('Action failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(null);
    }
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={adminScrollContentInsets(insets.bottom)}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={revalidating} onRefresh={() => setRefreshKey((k) => k + 1)} tintColor={c.azure500} />
      }
    >
      <AdminPageHeader
        eyebrow="verification"
        title="Documents"
        description="Review and verify member identity documents."
      />

      {loading && itemsList.length === 0 ? (
        <ActivityIndicator style={{ marginVertical: 20 }} color={c.azure500} />
      ) : (
        <View style={[styles.countRow, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.countLabel, { color: c.ink500 }]}>Pending review</Text>
          <Text style={[styles.countValue, { color: c.ink900 }]}>{itemsList.length}</Text>
        </View>
      )}

      {!token ? (
        <Text style={[styles.hint, { color: c.azure700 }]}>Sign in as admin to load pending documents.</Text>
      ) : null}

      {itemsList.map((it) => {
        const open = expandedUserId === it.userId;
        return (
          <View key={it.userId} style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={styles.cardHead}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.studentName, { color: c.ink900 }]} numberOfLines={1}>
                  {it.studentName}
                </Text>
                <Text style={[styles.memberId, { color: c.ink600 }]} numberOfLines={1}>
                  Device user id {it.libraryNumber.padStart(4, '0')}
                </Text>
              </View>
              <Button
                title={open ? 'Hide' : 'Review'}
                variant="secondary"
                onPress={() => {
                  setExpandedUserId(open ? null : it.userId);
                  setMemberNote('');
                }}
                style={styles.reviewBtn}
              />
            </View>

            {open ? (
              <View style={styles.reviewBlock}>
                {docsLoading ? (
                  <ActivityIndicator color={c.azure500} style={{ marginVertical: 12 }} />
                ) : docs.length === 0 ? (
                  <Text style={[styles.docHint, { color: c.ink600 }]}>No signed document URLs returned.</Text>
                ) : (
                  docs.map((d) => (
                    <View key={d.docType} style={styles.docRow}>
                      <Text style={[styles.docType, { color: c.ink800 }]}>{d.docType}</Text>
                      <Button
                        title="Open"
                        variant="ghost"
                        onPress={() => {
                          if (d.signedUrl) void Linking.openURL(d.signedUrl);
                        }}
                      />
                    </View>
                  ))
                )}
                <TextInput
                  value={memberNote}
                  onChangeText={setMemberNote}
                  placeholder="Note to member (required for resubmit)"
                  placeholderTextColor={c.ink400}
                  multiline
                  style={[
                    styles.noteInput,
                    { borderColor: c.border, color: c.ink900, backgroundColor: c.surfaceMuted },
                  ]}
                />
                <View style={styles.actionRow}>
                  <Button
                    title={busy === `${it.userId}:approve` ? '…' : 'Verify'}
                    disabled={!!busy}
                    onPress={() => void approve(it.userId)}
                    style={styles.actionBtn}
                  />
                  <Button
                    title={busy === `${it.userId}:request_resubmit` ? '…' : 'Resubmit'}
                    variant="secondary"
                    disabled={!!busy}
                    onPress={() => void respond(it.userId, 'request_resubmit')}
                    style={styles.actionBtn}
                  />
                  <Button
                    title={busy === `${it.userId}:reject` ? '…' : 'Reject'}
                    variant="secondary"
                    disabled={!!busy}
                    onPress={() => void respond(it.userId, 'reject')}
                    style={styles.actionBtn}
                  />
                </View>
                <Button
                  title="Open member"
                  variant="ghost"
                  onPress={() => router.push(`/(admin)/member/${encodeURIComponent(it.userId)}`)}
                />
              </View>
            ) : null}
          </View>
        );
      })}

      {token && !loading && itemsList.length === 0 ? (
        <View style={[styles.emptyBox, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.emptyTitle, { color: c.ink900 }]}>All caught up</Text>
          <Text style={[styles.emptyBody, { color: c.ink600 }]}>No members with pending KYC review.</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: ADMIN_GROUP_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
  },
  countLabel: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  countValue: { fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] },
  hint: { marginTop: 8, fontSize: 14, fontWeight: '500' },
  card: {
    borderRadius: ADMIN_GROUP_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 10,
  },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  studentName: { fontSize: 17, fontWeight: '600', letterSpacing: -0.2 },
  memberId: { marginTop: 4, fontSize: 14, fontWeight: '500' },
  reviewBtn: { paddingHorizontal: 12, minHeight: 40 },
  reviewBlock: { marginTop: 14, gap: 10 },
  docHint: { fontSize: 14, lineHeight: 20 },
  docRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  docType: { fontSize: 14, fontWeight: '600' },
  noteInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    minHeight: 72,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: { flexGrow: 1, minWidth: 100 },
  emptyBox: {
    padding: 22,
    borderRadius: ADMIN_GROUP_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  emptyTitle: { fontSize: 17, fontWeight: '600' },
  emptyBody: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
});

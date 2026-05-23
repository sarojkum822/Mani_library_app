import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';

import { adminGlassShadow } from '@/components/admin/adminGlassTheme';
import { FONT_SANS } from '@/constants/Fonts';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { displayPersonName } from '@/lib/formatPersonName';
import type { AdminFeedbackRow } from '@/lib/api';

const STAR_FILLED = '#EAB308';
const STAR_EMPTY = '#E1E6EE';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0] ?? '?').slice(0, 2).toUpperCase();
}

function StarRow({ rating }: { rating: number }) {
  const n = Math.min(5, Math.max(0, Math.round(rating)));
  return (
    <View style={styles.stars} accessibilityLabel={`${n} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Text key={i} style={[styles.starGlyph, { color: i < n ? STAR_FILLED : STAR_EMPTY }]}>
          ★
        </Text>
      ))}
    </View>
  );
}

type Props = {
  row: AdminFeedbackRow;
  busy?: boolean;
  onApprove: () => void;
  onDismiss: () => void;
  style?: ViewStyle;
};

export function AdminFeedbackCard({ row, busy, onApprove, onDismiss, style }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const name = displayPersonName(row.fullName, 'Member');
  const idLabel = row.deviceUserId != null ? String(row.deviceUserId).padStart(4, '0') : '—';
  const submitted =
    row.submittedAt != null
      ? new Date(row.submittedAt).toLocaleString('en-IN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      : null;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: c.surface,
          borderColor: c.border,
        },
        adminGlassShadow(),
        style,
      ]}
    >
      <View style={styles.header}>
        <View style={styles.identity}>
          <View style={[styles.avatar, { backgroundColor: c.emerald100 }]}>
            {row.avatarUrl ? (
              <Image source={{ uri: row.avatarUrl }} style={styles.avatarImg} accessibilityLabel="" />
            ) : (
              <Text style={[styles.avatarText, { color: c.emerald800 }]}>{initials(name)}</Text>
            )}
          </View>
          <View style={styles.meta}>
            <Text style={[styles.nameLine, { color: c.ink900 }]} numberOfLines={1}>
              {name} · ID {idLabel}
            </Text>
            <Text style={[styles.email, { color: c.ink500 }]} numberOfLines={1}>
              {row.email ?? '—'}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.badge,
            row.approved ? { backgroundColor: c.emerald100 } : { backgroundColor: c.amber100 },
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              { color: row.approved ? c.emerald800 : c.amber800 },
            ]}
          >
            {row.approved ? 'Approved' : 'Pending'}
          </Text>
        </View>
      </View>

      <StarRow rating={row.rating} />

      <Text style={[styles.quote, { color: c.ink800 }]}>"{row.comment}"</Text>

      {submitted ? (
        <Text style={[styles.submitted, { color: c.ink500 }]}>Submitted {submitted}</Text>
      ) : null}

      <View style={styles.actions}>
        {row.approved ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Unapprove feedback"
            disabled={busy}
            onPress={onDismiss}
            style={({ pressed }) => [
              styles.btnOutline,
              { borderColor: c.borderStrong },
              pressed && !busy ? styles.pressed : null,
              busy ? styles.btnDisabled : null,
            ]}
          >
            {busy ? (
              <ActivityIndicator color={c.azure600} />
            ) : (
              <Text style={[styles.btnOutlineText, { color: c.azure600 }]}>Unapprove</Text>
            )}
          </Pressable>
        ) : (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Approve feedback for homepage"
              disabled={busy}
              onPress={onApprove}
              style={({ pressed }) => [
                styles.btnPrimary,
                { backgroundColor: c.azure500 },
                pressed && !busy ? styles.pressed : null,
                busy ? styles.btnDisabled : null,
              ]}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnPrimaryText}>Approve</Text>
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dismiss without approving"
              disabled={busy}
              onPress={onDismiss}
              style={({ pressed }) => [
                styles.btnOutline,
                { borderColor: c.borderStrong },
                pressed && !busy ? styles.pressed : null,
                busy ? styles.btnDisabled : null,
              ]}
            >
              <Text style={[styles.btnOutlineText, { color: c.azure600 }]}>Dismiss</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  identity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: 48, height: 48 },
  avatarText: {
    fontFamily: FONT_SANS.bold,
    fontSize: 15,
    letterSpacing: 0.2,
  },
  meta: { flex: 1, minWidth: 0, gap: 4 },
  nameLine: {
    fontFamily: FONT_SANS.semibold,
    fontSize: 16,
    letterSpacing: -0.2,
  },
  email: {
    fontFamily: FONT_SANS.regular,
    fontSize: 14,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    flexShrink: 0,
  },
  badgeText: {
    fontFamily: FONT_SANS.semibold,
    fontSize: 12,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  starGlyph: {
    fontSize: 18,
    lineHeight: 22,
  },
  quote: {
    fontFamily: FONT_SANS.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  submitted: {
    fontFamily: FONT_SANS.regular,
    fontSize: 12,
    marginTop: -6,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  btnPrimary: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    fontFamily: FONT_SANS.semibold,
    fontSize: 16,
    color: '#fff',
  },
  btnOutline: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOutlineText: {
    fontFamily: FONT_SANS.semibold,
    fontSize: 16,
  },
  pressed: { opacity: 0.88 },
  btnDisabled: { opacity: 0.55 },
});

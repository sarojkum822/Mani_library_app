import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import Colors from '@/constants/Colors';
import { FONT_SANS } from '@/constants/Fonts';
import { useColorScheme } from '@/components/useColorScheme';
import type { Membership } from '@/lib/api';

const GRADIENT = ['#D6E8F8', '#E8F3FC', '#F5FAFF'] as const;

function statusLabel(m: Membership): string {
  if (m.status === 'upcoming') return 'Starts soon';
  if (m.status === 'active') return 'Active';
  if (m.status === 'expiring_soon') return 'Expiring soon';
  if (m.status === 'expired') return 'Expired';
  return 'Not active';
}

function statusColors(m: Membership, c: (typeof Colors)['light']) {
  if (m.status === 'active') return { bg: c.emerald100, fg: c.emerald800 };
  if (m.status === 'expiring_soon' || m.status === 'upcoming') return { bg: c.amber100, fg: c.amber800 };
  if (m.status === 'expired') return { bg: c.red100, fg: c.red700 };
  return { bg: c.ink100, fg: c.ink600 };
}

function seatLine(m: Membership): string {
  const raw = m.seatNo?.trim();
  if (!raw || raw === '—') return 'Seat —';
  if (/^[A-Za-z]/.test(raw)) return `Seat ${raw}`;
  return `Seat F${raw}`;
}

function formatValidThrough(iso: string | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function memberIdLine(m: Membership): string {
  const id = m.deviceUserId?.trim();
  if (!id || id === '—') return '—';
  if (id.startsWith('#')) return id;
  const digits = id.replace(/\D/g, '');
  return digits ? `#${digits.padStart(4, '0')}` : `#${id}`;
}

type Props = {
  membership: Membership;
  renewLabel: string;
  renewVisible: boolean;
  onRenew: () => void;
  onViewSeats?: () => void;
  loading?: boolean;
  style?: ViewStyle;
};

export function MemberMembershipHeroCard({
  membership,
  renewLabel,
  renewVisible,
  onRenew,
  onViewSeats,
  loading,
  style,
}: Props) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const badge = statusColors(membership, c);
  const isUpcoming = membership.status === 'upcoming';

  return (
    <View style={[styles.wrap, style]}>
      <LinearGradient colors={[...GRADIENT]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>
        <View style={styles.top}>
          <View style={styles.planBlock}>
            <Text style={[styles.kicker, { color: c.ink500 }]}>Current plan</Text>
            <Text style={[styles.planTitle, { color: c.ink900 }]} numberOfLines={2}>
              {membership.planName ?? 'Membership'}
            </Text>
            <Text style={[styles.seatLine, { color: c.ink600 }]}>{seatLine(membership)}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.fg }]}>{statusLabel(membership)}</Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: 'rgba(1, 96, 208, 0.12)' }]} />

        <View style={styles.metrics}>
          <View style={styles.metricCol}>
            <Text style={[styles.metricLabel, { color: c.ink500 }]}>
              {isUpcoming ? 'Starts' : 'Valid through'}
            </Text>
            <Text style={[styles.metricValue, { color: c.ink900 }]}>
              {isUpcoming ? formatValidThrough(membership.startsAt) : formatValidThrough(membership.expiresAt)}
            </Text>
          </View>
          <View style={styles.metricCol}>
            <Text style={[styles.metricLabel, { color: c.ink500 }]}>Member ID</Text>
            <Text style={[styles.metricValue, { color: c.ink900 }]}>{memberIdLine(membership)}</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={c.azure600} style={{ marginTop: 16 }} />
        ) : (
          <View style={styles.actions}>
            {onViewSeats ? (
              <Pressable
                accessibilityRole="button"
                onPress={onViewSeats}
                style={({ pressed }) => [
                  styles.ghostBtn,
                  { borderColor: 'rgba(255,255,255,0.55)' },
                  pressed && { opacity: 0.88 },
                ]}
              >
                <Text style={styles.ghostBtnText}>View seats</Text>
              </Pressable>
            ) : null}
            {renewVisible ? (
              <Pressable
                accessibilityRole="button"
                onPress={onRenew}
                style={({ pressed }) => [
                  styles.ghostBtn,
                  styles.ghostBtnPrimary,
                  { borderColor: 'rgba(255,255,255,0.7)' },
                  pressed && { opacity: 0.88 },
                ]}
              >
                <Text style={styles.ghostBtnText}>{renewLabel}</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(1, 96, 208, 0.14)',
  },
  gradient: {
    padding: 22,
    gap: 16,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  planBlock: { flex: 1, minWidth: 0, gap: 6 },
  kicker: {
    fontFamily: FONT_SANS.medium,
    fontSize: 14,
  },
  planTitle: {
    fontFamily: FONT_SANS.bold,
    fontSize: 22,
    letterSpacing: -0.35,
    lineHeight: 28,
  },
  seatLine: {
    fontFamily: FONT_SANS.medium,
    fontSize: 16,
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  badgeText: {
    fontFamily: FONT_SANS.semibold,
    fontSize: 13,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  metrics: {
    flexDirection: 'row',
    gap: 24,
  },
  metricCol: { flex: 1, gap: 6 },
  metricLabel: {
    fontFamily: FONT_SANS.regular,
    fontSize: 14,
  },
  metricValue: {
    fontFamily: FONT_SANS.bold,
    fontSize: 17,
    letterSpacing: -0.2,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  ghostBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  ghostBtnPrimary: {
    backgroundColor: 'rgba(1, 96, 208, 0.18)',
  },
  ghostBtnText: {
    fontFamily: FONT_SANS.semibold,
    fontSize: 16,
    color: '#fff',
  },
});

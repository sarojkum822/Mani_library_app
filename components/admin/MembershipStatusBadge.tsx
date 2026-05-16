import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import {
  membershipStatusColors,
  membershipStatusDisplayLabel,
  membershipStatusHint,
  type Member,
} from '@/lib/members';

type Props = {
  member: Member;
  align?: 'start' | 'end';
};

/** Pill + hint — matches staff website Members table (Active / Upcoming / Cancelled). */
export function MembershipStatusBadge({ member, align = 'end' }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const colors = membershipStatusColors(member, c);
  const label = membershipStatusDisplayLabel(member);
  const hint = membershipStatusHint(member);

  return (
    <View style={[styles.wrap, align === 'start' && styles.wrapStart]}>
      <View style={[styles.pill, { backgroundColor: colors.bg, borderColor: colors.border }]}>
        <Text style={[styles.pillText, { color: colors.fg }]}>{label}</Text>
      </View>
      {hint ? (
        <Text style={[styles.hint, { color: c.ink500, textAlign: align === 'start' ? 'left' : 'right' }]}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'flex-end', gap: 3, maxWidth: 140 },
  wrapStart: { alignItems: 'flex-start' },
  pill: {
    alignSelf: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pillText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  hint: { fontSize: 10, fontWeight: '500' },
});

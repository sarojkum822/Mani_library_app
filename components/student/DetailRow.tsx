import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CLARITY_MONO } from '@/components/admin/clarityTokens';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export function DetailRow({
  label,
  value,
  mono,
  last,
}: {
  label: string;
  value: string;
  mono?: boolean;
  last?: boolean;
}) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  return (
    <View style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.ink100 }]}>
      <Text style={[styles.label, { color: c.ink500 }]}>{label}</Text>
      <Text
        style={[styles.value, { color: c.ink900 }, mono && styles.mono]}
        selectable={mono}
        numberOfLines={4}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 4,
  },
  label: { fontSize: 12, fontWeight: '600' },
  value: { fontSize: 15, fontWeight: '500', lineHeight: 21 },
  mono: { ...CLARITY_MONO, fontSize: 14 },
});

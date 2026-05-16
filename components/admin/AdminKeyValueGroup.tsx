import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import Colors from '@/constants/Colors';
import { ADMIN_GROUP_RADIUS } from '@/components/admin/layoutTokens';
import { useColorScheme } from '@/components/useColorScheme';

type Row = { label: string; value: React.ReactNode };

type Props = {
  title?: string;
  rows: Row[];
  style?: ViewStyle;
};

/** iOS Settings–style key/value grouped card. */
export function AdminKeyValueGroup({ title, rows, style }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  return (
    <View style={[styles.wrap, { backgroundColor: c.surface, borderColor: c.border }, style]}>
      {title ? (
        <Text style={[styles.sectionTitle, { color: c.ink500 }]}>{title.toUpperCase()}</Text>
      ) : null}
      {rows.map((row, i) => (
        <View
          key={row.label}
          style={[styles.row, { borderBottomColor: c.border }, i === rows.length - 1 && styles.rowLast]}
        >
          <Text style={[styles.label, { color: c.ink500 }]}>{row.label}</Text>
          {typeof row.value === 'string' || typeof row.value === 'number' ? (
            <Text style={[styles.value, { color: c.ink900 }]}>{row.value}</Text>
          ) : (
            <View style={styles.valueNode}>{row.value}</View>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: ADMIN_GROUP_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLast: { borderBottomWidth: 0 },
  label: { fontSize: 15, fontWeight: '400', flexShrink: 0 },
  value: { fontSize: 15, fontWeight: '600', textAlign: 'right', flex: 1 },
  valueNode: { flex: 1, alignItems: 'flex-end' },
});

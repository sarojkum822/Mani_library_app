import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import {
  CLARITY_BODY,
  CLARITY_LIST_DETAIL,
  CLARITY_METRIC_LABEL,
  adminCardChrome,
} from '@/components/admin/clarityTokens';
import Colors from '@/constants/Colors';
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
    <View style={[styles.wrap, adminCardChrome(c), style]}>
      {title ? (
        <Text style={[CLARITY_METRIC_LABEL, styles.sectionTitle, { color: c.ink500 }]}>{title.toUpperCase()}</Text>
      ) : null}
      {rows.map((row, i) => (
        <View
          key={row.label}
          style={[styles.row, { borderBottomColor: c.border }, i === rows.length - 1 && styles.rowLast]}
        >
          <Text style={[CLARITY_BODY, styles.label, { color: c.ink500 }]}>{row.label}</Text>
          {typeof row.value === 'string' || typeof row.value === 'number' ? (
            <Text style={[CLARITY_LIST_DETAIL, styles.value, { color: c.ink900 }]}>{row.value}</Text>
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
    overflow: 'hidden',
  },
  sectionTitle: {
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
  label: { flexShrink: 0 },
  value: { textAlign: 'right', flex: 1 },
  valueNode: { flex: 1, alignItems: 'flex-end' },
});

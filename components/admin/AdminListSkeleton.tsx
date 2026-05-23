import React from 'react';
import { StyleSheet, View } from 'react-native';

import { adminCardChrome, useAdminPalette } from '@/components/admin/clarityTokens';

export function AdminListSkeleton({ rows = 6 }: { rows?: number }) {
  const c = useAdminPalette();

  return (
    <View style={styles.wrap} accessibilityLabel="Loading" accessibilityRole="progressbar">
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={[adminCardChrome(c), styles.row]}>
          <View style={[styles.avatar, { backgroundColor: c.ink100 }]} />
          <View style={styles.lines}>
            <View style={[styles.line, styles.lineWide, { backgroundColor: c.ink100 }]} />
            <View style={[styles.line, { backgroundColor: c.ink100 }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10, paddingTop: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
  },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  lines: { flex: 1, gap: 8 },
  line: { height: 10, borderRadius: 6, width: '55%' },
  lineWide: { width: '72%' },
});

import React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { adminCardChrome, CLARITY_CARD_PADDING, useAdminPalette } from '@/components/admin/clarityTokens';

function SkeletonCard() {
  const c = useAdminPalette();
  return (
    <View style={[styles.card, adminCardChrome(c)]}>
      <View style={[styles.label, { backgroundColor: c.ink100 }]} />
      <View style={[styles.value, { backgroundColor: c.ink100 }]} />
      <View style={[styles.hint, { backgroundColor: c.ink100 }]} />
    </View>
  );
}

export function AdminKpiSkeleton({ count = 5 }: { count?: number }) {
  const { width } = useWindowDimensions();
  const useGrid = width < 768;

  if (useGrid) {
    return (
      <View style={styles.grid} accessibilityLabel="Loading overview" accessibilityRole="progressbar">
        {Array.from({ length: count }, (_, i) => (
          <View key={i} style={styles.gridCell}>
            <SkeletonCard />
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.row} accessibilityLabel="Loading overview" accessibilityRole="progressbar">
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.rowCell}>
          <SkeletonCard />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  gridCell: { width: '48%', minWidth: 0 },
  row: { flexDirection: 'row', gap: 12 },
  rowCell: { flex: 1, minWidth: 140 },
  card: {
    width: '100%',
    minHeight: 120,
    padding: CLARITY_CARD_PADDING,
    gap: 10,
  },
  label: { height: 8, width: '50%', borderRadius: 4 },
  value: { height: 28, width: '40%', borderRadius: 6 },
  hint: { height: 8, width: '80%', borderRadius: 4 },
});

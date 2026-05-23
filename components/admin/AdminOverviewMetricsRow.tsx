import React from 'react';
import { Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

const GAP = 12;
const CARD_MIN = 168;
const GRID_BREAKPOINT = 768;

type Props = {
  children: React.ReactNode;
};

/** Overview KPIs: 2×2 grid on phones; horizontal row on wider screens. */
export function AdminOverviewMetricsRow({ children }: Props) {
  const { width } = useWindowDimensions();
  const items = React.Children.toArray(children).filter(Boolean);
  const count = items.length || 1;
  const useGrid = width < GRID_BREAKPOINT;

  if (useGrid) {
    const rows: React.ReactNode[][] = [];
    for (let i = 0; i < items.length; i += 2) {
      rows.push(items.slice(i, i + 2));
    }
    return (
      <View style={styles.gridStack}>
        {rows.map((pair, rowIdx) => (
          <View key={rowIdx} style={styles.gridRow}>
            {pair.map((child, i) => (
              <View key={i} style={styles.gridCell}>
                {child}
              </View>
            ))}
            {pair.length === 1 ? <View style={styles.gridCell} /> : null}
          </View>
        ))}
      </View>
    );
  }

  const fitsRow = width >= CARD_MIN * count + GAP * Math.max(0, count - 1);
  if (fitsRow) {
    return (
      <View style={styles.row}>
        {items.map((child, i) => (
          <View key={i} style={styles.flexItem}>
            {child}
          </View>
        ))}
      </View>
    );
  }

  const cardW = Math.min(280, Math.max(CARD_MIN, width * 0.34));
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={Platform.OS === 'web'}
      contentContainerStyle={styles.scrollContent}
    >
      {items.map((child, i) => (
        <View key={i} style={{ width: cardW, marginRight: i < items.length - 1 ? GAP : 0 }}>
          {child}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  gridStack: { gap: GAP },
  gridRow: { flexDirection: 'row', gap: GAP, alignItems: 'stretch' },
  gridCell: { flex: 1, minWidth: 0 },
  row: { flexDirection: 'row', gap: GAP, alignItems: 'stretch' },
  flexItem: { flex: 1, minWidth: CARD_MIN },
  scrollContent: { paddingVertical: 2 },
});

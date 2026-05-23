import React from 'react';
import { StyleSheet, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

function Bone({ width, height, style }: { width: number | `${number}%`; height: number; style?: object }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return <View style={[{ width, height, borderRadius: 6, backgroundColor: c.ink100 }, style]} />;
}

function MiniCardSkeleton() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <View style={[styles.miniCard, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Bone width={36} height={36} style={{ borderRadius: 10 }} />
      <Bone width="45%" height={28} style={{ marginTop: 4 }} />
      <Bone width="70%" height={12} />
      <Bone width="55%" height={10} style={{ marginTop: 4 }} />
    </View>
  );
}

function PanelSkeleton({ tall }: { tall?: boolean }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <View style={[styles.panel, { backgroundColor: c.surface, borderColor: c.border, minHeight: tall ? 200 : 140 }]}>
      <View style={styles.panelHead}>
        <Bone width={120} height={16} />
        <Bone width={72} height={12} />
      </View>
      <Bone width="55%" height={32} style={{ marginTop: 8 }} />
      <Bone width="80%" height={12} style={{ marginTop: 8 }} />
      {tall ? (
        <View style={{ gap: 10, marginTop: 16 }}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.barRow}>
              <Bone width={28} height={12} />
              <Bone width="100%" height={10} style={{ flex: 1 }} />
              <Bone width={40} height={12} />
            </View>
          ))}
        </View>
      ) : (
        <View style={{ gap: 12, marginTop: 14 }}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.listRow}>
              <Bone width={44} height={44} style={{ borderRadius: 22 }} />
              <View style={{ flex: 1, gap: 6 }}>
                <Bone width="60%" height={14} />
                <Bone width="80%" height={11} />
              </View>
              <Bone width={52} height={22} style={{ borderRadius: 999 }} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export function AdminOverviewDashboardSkeleton() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  return (
    <View style={styles.wrap} accessibilityLabel="Loading overview" accessibilityRole="progressbar">
      <View style={styles.dateRow}>
        <Bone width={140} height={14} />
        <Bone width={56} height={24} style={{ borderRadius: 999 }} />
      </View>
      <View style={styles.statGrid}>
        <MiniCardSkeleton />
        <MiniCardSkeleton />
        <MiniCardSkeleton />
        <MiniCardSkeleton />
      </View>
      <PanelSkeleton tall />
      <PanelSkeleton />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 16 },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  miniCard: {
    width: '48%',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 8,
    minHeight: 132,
  },
  panel: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
  },
  panelHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});

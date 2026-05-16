import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export type AdminSegment<T extends string> = {
  id: T;
  label: string;
  count?: number;
};

type Props<T extends string> = {
  segments: AdminSegment<T>[];
  value: T;
  onChange: (id: T) => void;
};

/** Horizontally scrollable segmented control (iOS UISegmentedControl style). */
export function AdminSegmentedControl<T extends string>({ segments, value, onChange }: Props<T>) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
      style={styles.root}
    >
      <View style={[styles.track, { backgroundColor: c.surfaceSunken, borderColor: c.border, borderWidth: StyleSheet.hairlineWidth }]}>
        {segments.map((seg) => {
          const selected = seg.id === value;
          return (
            <Pressable
              key={seg.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onChange(seg.id)}
              style={({ pressed }) => [
                styles.segment,
                selected && { backgroundColor: c.surface, shadowColor: '#101828', shadowOpacity: 0.06, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
                pressed && !selected && { opacity: 0.85 },
              ]}
            >
              <Text
                style={[
                  styles.label,
                  { color: selected ? c.azure700 : c.ink600 },
                  selected && styles.labelSelected,
                ]}
                numberOfLines={1}
              >
                {seg.label}
                {seg.count !== undefined ? ` (${seg.count})` : ''}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flexGrow: 0 },
  scroll: { paddingVertical: 2 },
  track: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  segment: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  label: { fontSize: 13, fontWeight: '500' },
  labelSelected: { fontWeight: '600' },
});

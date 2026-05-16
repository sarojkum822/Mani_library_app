import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { shadowCard } from '@/components/ui/Screen';

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  return (
    <View style={[styles.base, shadowCard(), { backgroundColor: c.surface, borderColor: c.border }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
  },
});


import React from 'react';
import { Platform, StyleSheet, View, ViewStyle } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { cardElevation } from '@/lib/platformStyles';

function studentCardChrome(c: (typeof Colors)['light']): ViewStyle {
  const base: ViewStyle = {
    backgroundColor: c.surface,
    borderRadius: 16,
    overflow: 'hidden',
  };
  if (Platform.OS === 'android') {
    return {
      ...base,
      borderColor: c.border,
      borderWidth: StyleSheet.hairlineWidth,
    };
  }
  return {
    ...base,
    borderColor: c.border,
    borderWidth: StyleSheet.hairlineWidth,
    ...cardElevation(),
  };
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  return <View style={[studentCardChrome(c), styles.base, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    padding: 14,
  },
});

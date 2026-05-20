import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { adminCardChrome } from '@/components/admin/clarityTokens';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  return <View style={[adminCardChrome(c), styles.base, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    padding: 14,
  },
});

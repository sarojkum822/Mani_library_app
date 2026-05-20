import React from 'react';
import { StyleSheet, Text } from 'react-native';

import Colors from '@/constants/Colors';
import { FONT_SANS } from '@/constants/Fonts';
import { useColorScheme } from '@/components/useColorScheme';

export function StudentFieldError({ message }: { message: string | null | undefined }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  if (!message?.trim()) return null;
  return <Text style={[styles.err, { color: c.red700 }]}>{message}</Text>;
}

const styles = StyleSheet.create({
  err: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: FONT_SANS.medium,
    marginTop: -8,
  },
});

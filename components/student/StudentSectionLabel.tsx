import React from 'react';
import { StyleSheet, Text, type TextStyle, type ViewStyle } from 'react-native';

import { CLARITY_METRIC_LABEL } from '@/components/admin/clarityTokens';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export function StudentSectionLabel({
  title,
  style,
}: {
  title: string;
  style?: ViewStyle;
}) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <Text style={[CLARITY_METRIC_LABEL, styles.label, { color: c.ink500 }, style as TextStyle]}>{title}</Text>
  );
}

const styles = StyleSheet.create({
  label: {
    marginTop: 22,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
});

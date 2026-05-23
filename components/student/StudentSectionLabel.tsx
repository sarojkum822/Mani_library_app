import React from 'react';
import { StyleSheet, Text, type TextStyle, type ViewStyle } from 'react-native';

import { CLARITY_METRIC_LABEL } from '@/components/admin/clarityTokens';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export function StudentSectionLabel({
  title,
  style,
  variant = 'default',
}: {
  title: string;
  style?: ViewStyle;
  /** Profile hub — sentence case, no all-caps tracking. */
  variant?: 'default' | 'profile';
}) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const textStyle =
    variant === 'profile'
      ? [styles.profileLabel, { color: c.ink500 }]
      : [CLARITY_METRIC_LABEL, styles.label, { color: c.ink500 }];
  return (
    <Text style={[...textStyle, style as TextStyle]}>{title}</Text>
  );
}

const styles = StyleSheet.create({
  label: {
    marginTop: 22,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  profileLabel: {
    marginTop: 22,
    marginBottom: 8,
    paddingHorizontal: 2,
    fontSize: 14,
    fontWeight: '600',
  },
});

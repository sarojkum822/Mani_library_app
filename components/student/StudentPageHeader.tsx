import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { type } from '@/constants/Typography';
import { useColorScheme } from '@/components/useColorScheme';

type Props = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
};

export function StudentPageHeader({ title, subtitle, right }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.header,
        {
          borderBottomColor: c.border,
          backgroundColor: c.surface,
          paddingTop: insets.top + 16,
        },
      ]}
    >
      <View style={styles.textCol}>
        <Text style={[styles.title, { color: c.ink900 }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: c.ink600 }]}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  textCol: { flex: 1, minWidth: 0 },
  right: { alignItems: 'flex-end', justifyContent: 'center' },
  title: { ...type.screenTitle, letterSpacing: -0.25 },
  subtitle: { marginTop: 6, ...type.caption, fontWeight: '500' },
});

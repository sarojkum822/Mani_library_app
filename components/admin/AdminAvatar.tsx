import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { displayPersonName } from '@/lib/formatPersonName';

export function AdminAvatar({ name, small }: { name: string; small?: boolean }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const display = displayPersonName(name, name.trim() || '—');
  const initials = display
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('');

  return (
    <View
      style={[
        styles.base,
        small ? styles.small : styles.large,
        { backgroundColor: c.ink100 },
      ]}
    >
      <Text style={[styles.text, small ? styles.textSmall : null, { color: c.ink700 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  large: { width: 36, height: 36 },
  small: { width: 28, height: 28 },
  text: { fontFamily: 'SpaceMono', fontWeight: '600', fontSize: 12 },
  textSmall: { fontSize: 10 },
});

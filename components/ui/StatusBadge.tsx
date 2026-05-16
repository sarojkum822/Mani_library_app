import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

/** Aligns with web `manilibrary` dashboard badges — supports dot leader like the web `dot` prop. */
export type StatusTone = 'success' | 'warning' | 'neutral' | 'azure' | 'danger' | 'warn';

type Props = {
  tone?: StatusTone;
  label: string;
  dot?: boolean;
};

export function StatusBadge({ tone = 'neutral', label, dot }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  const resolved =
    tone === 'success' || tone === 'azure'
      ? { bg: c.azure50, fg: c.azure700, bd: c.azure100, dot: c.azure500 }
      : tone === 'warning' || tone === 'warn'
        ? { bg: c.azure50, fg: c.azure700, bd: c.azure100, dot: c.azure500 }
        : tone === 'danger'
          ? { bg: c.ink100, fg: c.ink900, bd: c.ink300, dot: c.ink900 }
          : { bg: c.surfaceSunken, fg: c.ink700, bd: c.border, dot: c.ink400 };

  return (
    <View style={[styles.base, { backgroundColor: resolved.bg, borderColor: resolved.bd }]}>
      {dot ? <View style={[styles.dot, { backgroundColor: resolved.dot }]} /> : null}
      <Text style={[styles.text, { color: resolved.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 11, fontWeight: '600' },
});

import * as Clipboard from 'expo-clipboard';
import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

type Props = {
  value: string;
  label?: string;
  preview?: string;
};

export function CopyIdButton({ value, label = 'Copy', preview }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    const v = value.trim();
    if (!v) return;
    try {
      await Clipboard.setStringAsync(v);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      Alert.alert('Copy failed', 'Could not copy to clipboard.');
    }
  }, [value]);

  if (!value.trim()) {
    return <Text style={[styles.empty, { color: c.ink500 }]}>—</Text>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} ${preview ?? value}`}
      onPress={() => void copy()}
      style={({ pressed }) => [styles.wrap, pressed && { opacity: 0.85 }]}
    >
      <Text style={[styles.preview, { color: c.ink800 }]} numberOfLines={1} selectable>
        {preview ?? value}
      </Text>
      <Text style={[styles.btn, { color: c.azure600, borderColor: c.border }]}>{copied ? 'Copied' : label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, minWidth: 0 },
  preview: { fontSize: 11, fontFamily: 'SpaceMono', fontWeight: '600' },
  btn: {
    alignSelf: 'flex-start',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  empty: { fontSize: 13, fontWeight: '500' },
});

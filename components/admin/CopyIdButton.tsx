import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';

import {
  CLARITY_CHIP_XS_RADIUS,
  CLARITY_HINT,
  CLARITY_METRIC_LABEL,
  CLARITY_MONO_SM,
} from '@/components/admin/clarityTokens';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { copyToClipboard } from '@/lib/clipboard';

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
      const ok = await copyToClipboard(v);
      if (ok) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      Alert.alert('Copy failed', 'Could not copy to clipboard.');
    }
  }, [value]);

  if (!value.trim()) {
    return <Text style={[CLARITY_HINT, { color: c.ink500 }]}>—</Text>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} ${preview ?? value}`}
      onPress={() => void copy()}
      style={({ pressed }) => [styles.wrap, pressed && { opacity: 0.85 }]}
    >
      <Text style={[CLARITY_MONO_SM, { color: c.ink800 }]} numberOfLines={1} selectable>
        {preview ?? value}
      </Text>
      <Text style={[CLARITY_METRIC_LABEL, styles.btn, { color: c.azure600, borderColor: c.border }]}>
        {copied ? 'Copied' : label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, minWidth: 0 },
  btn: {
    alignSelf: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: CLARITY_CHIP_XS_RADIUS,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});

import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import Colors from '@/constants/Colors';
import { FONT_MONO, FONT_SANS } from '@/constants/Fonts';
import { useColorScheme } from '@/components/useColorScheme';
import { copyToClipboard } from '@/lib/clipboard';

type Props = {
  deviceId: string;
  loading?: boolean;
};

export function MemberIdCard({ deviceId, loading }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [copied, setCopied] = useState(false);
  const id = deviceId.trim();
  const hasId = id.length > 0 && id !== '—';

  const onCopy = useCallback(async () => {
    if (!hasId) return;
    try {
      const ok = await copyToClipboard(id);
      if (ok) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      Alert.alert('Copy failed', 'Could not copy to clipboard.');
    }
  }, [hasId, id]);

  return (
    <View style={[styles.row, { borderTopColor: c.ink100 }]}>
      <View style={styles.textCol}>
        <Text style={[styles.label, { color: c.ink500 }]}>Member ID</Text>
        {loading ? (
          <ActivityIndicator color={c.azure500} style={{ marginTop: 6, alignSelf: 'flex-start' }} />
        ) : (
          <Text
            style={[styles.id, { color: c.ink900 }]}
            selectable
            accessibilityLabel={`Member ID ${hasId ? id : 'not available'}`}
          >
            {hasId ? id : '—'}
          </Text>
        )}
      </View>
      {hasId && !loading ? (
        <Pressable
          onPress={() => void onCopy()}
          accessibilityRole="button"
          accessibilityLabel={copied ? 'Copied' : 'Copy member ID'}
          hitSlop={10}
          style={({ pressed }) => [
            styles.copyBtn,
            { backgroundColor: c.surfaceMuted, borderColor: c.border },
            pressed && { opacity: 0.8 },
          ]}
        >
          <FontAwesome name={copied ? 'check' : 'copy'} size={16} color={c.azure600} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    width: '100%',
  },
  textCol: { flex: 1, minWidth: 0, gap: 4 },
  label: {
    fontFamily: FONT_SANS.medium,
    fontSize: 13,
    fontWeight: '500',
  },
  id: {
    fontFamily: FONT_MONO.semibold,
    fontSize: 24,
    letterSpacing: 1,
    lineHeight: 30,
  },
  copyBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

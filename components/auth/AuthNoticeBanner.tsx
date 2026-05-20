import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export type AuthNotice = {
  title: string;
  body?: string;
};

type Props = {
  notice: AuthNotice | null;
  onDismiss: () => void;
};

export function AuthNoticeBanner({ notice, onDismiss }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();

  if (!notice) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, { paddingTop: insets.top + 6 }]}
    >
      <View style={[styles.banner, { backgroundColor: c.azure600, borderColor: c.azure500 }]}>
        <View style={styles.textCol}>
          <Text style={styles.title}>{notice.title}</Text>
          {notice.body ? <Text style={styles.body}>{notice.body}</Text> : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss notification"
          onPress={onDismiss}
          hitSlop={10}
          style={({ pressed }) => [styles.dismiss, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.dismissText}>✕</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: 12,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#101828',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  textCol: { flex: 1, minWidth: 0, gap: 2 },
  title: { color: '#fff', fontSize: 15, fontWeight: '700' },
  body: { color: 'rgba(255,255,255,0.92)', fontSize: 13, lineHeight: 18, fontWeight: '500' },
  dismiss: { padding: 2 },
  dismissText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

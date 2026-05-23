import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { FONT_SANS } from '@/constants/Fonts';
import { useColorScheme } from '@/components/useColorScheme';
import {
  ADMIN_BOTTOM_NAV,
  ADMIN_BOTTOM_NAV_HEIGHT,
  type AdminNavKey,
} from '@/components/admin/navigation';
import { adminGlassBarChrome } from '@/components/admin/adminGlassTheme';
import { hapticLight } from '@/lib/safeHaptics';

function activeKeyFromSegments(segments: string[]): AdminNavKey | null {
  const adminIdx = segments.findIndex((s) => s === '(admin)');
  if (adminIdx < 0) return null;
  const leaf = segments[adminIdx + 1];
  if (!leaf) return 'overview';
  if (leaf === 'member') return 'members';
  const hit = ADMIN_BOTTOM_NAV.find((n) => n.key === leaf);
  return hit?.key ?? null;
}

type Props = {
  onMenuPress: () => void;
};

export function AdminBottomNav({ onMenuPress }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const active = useMemo(() => activeKeyFromSegments(segments as unknown as string[]), [segments]);
  const bottom = Math.max(insets.bottom, 8);

  return (
    <View
      style={[
        styles.bar,
        adminGlassBarChrome(c),
        {
          paddingBottom: bottom,
          height: ADMIN_BOTTOM_NAV_HEIGHT + bottom,
          borderTopWidth: StyleSheet.hairlineWidth,
        },
      ]}
    >
      {ADMIN_BOTTOM_NAV.map((item) => {
        const isActive = active === item.key;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={item.label}
            onPress={() => {
              hapticLight();
              router.push(item.href as never);
            }}
            style={({ pressed }) => [styles.item, pressed && { opacity: 0.85 }]}
          >
            <FontAwesome name={item.icon} size={20} color={isActive ? c.tint : c.tabIconDefault} />
            <Text
              style={[
                styles.label,
                { color: isActive ? c.tint : c.tabIconDefault, fontFamily: isActive ? FONT_SANS.semibold : FONT_SANS.medium },
              ]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="More menu"
        onPress={() => {
          hapticLight();
          onMenuPress();
        }}
        style={({ pressed }) => [styles.item, pressed && { opacity: 0.85 }]}
      >
        <FontAwesome name="bars" size={20} color={c.tabIconDefault} />
        <Text style={[styles.label, { color: c.tabIconDefault, fontFamily: FONT_SANS.medium }]} numberOfLines={1}>
          Menu
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minHeight: 44,
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.15,
  },
});

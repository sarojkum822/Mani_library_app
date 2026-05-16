import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Ionicons from '@expo/vector-icons/Ionicons';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { hapticLight } from '@/lib/safeHaptics';

type IonName = React.ComponentProps<typeof Ionicons>['name'];
type FAName = React.ComponentProps<typeof FontAwesome>['name'];

export function SettingsRow({
  icon,
  iconIon,
  title,
  subtitle,
  onPress,
  showSeparator,
  destructive,
  detail,
  disabled,
}: {
  icon?: FAName;
  /** Prefer for iOS-style profile menus (SF Symbols–like). */
  iconIon?: IonName;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  showSeparator?: boolean;
  destructive?: boolean;
  detail?: string;
  disabled?: boolean;
}) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const titleColor = destructive ? '#D92D20' : c.ink900;
  const subColor = destructive ? 'rgba(217,45,32,0.75)' : c.ink500;
  const iconTint = destructive ? '#D92D20' : c.azure600;
  const wrapBg = destructive ? 'rgba(217,45,32,0.08)' : c.azure50;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || !onPress}
      onPress={() => {
        if (!onPress || disabled) return;
        hapticLight();
        onPress();
      }}
      style={({ pressed }) => [
        styles.row,
        showSeparator && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
        pressed && onPress && !disabled ? { backgroundColor: c.surfaceMuted } : null,
        disabled ? { opacity: 0.45 } : null,
      ]}
    >
      {iconIon ? (
        <View style={[styles.iconWrap, { backgroundColor: wrapBg }]}>
          <Ionicons name={iconIon} size={22} color={iconTint} />
        </View>
      ) : icon ? (
        <View style={[styles.iconWrap, { backgroundColor: wrapBg }]}>
          <FontAwesome name={icon} size={19} color={iconTint} />
        </View>
      ) : (
        <View style={{ width: 44 }} />
      )}
      <View style={styles.textCol}>
        <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
        {subtitle ? <Text style={[styles.sub, { color: subColor }]}>{subtitle}</Text> : null}
      </View>
      {detail ? (
        <Text style={[styles.detail, { color: c.ink500 }]} numberOfLines={1}>
          {detail}
        </Text>
      ) : null}
      {onPress && !disabled ? (
        <Ionicons name="chevron-forward" size={20} color={c.ink300} style={styles.chev} />
      ) : (
        <View style={{ width: 20 }} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingVertical: 11,
    paddingHorizontal: 16,
    gap: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: { flex: 1, minWidth: 0 },
  /** iOS Settings–style body (≈17pt SF Pro). */
  title: {
    fontSize: 17,
    fontWeight: '400',
    letterSpacing: -0.43,
    lineHeight: 22,
  },
  sub: {
    fontSize: 13,
    fontWeight: '400',
    marginTop: 2,
    lineHeight: 18,
    letterSpacing: -0.08,
  },
  detail: { fontSize: 15, fontWeight: '400', maxWidth: '36%', letterSpacing: -0.24 },
  chev: { marginLeft: 2 },
});

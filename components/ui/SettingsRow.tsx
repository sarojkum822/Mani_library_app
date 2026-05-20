import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Ionicons from '@expo/vector-icons/Ionicons';

import { CLARITY_BODY, CLARITY_HINT, CLARITY_ROW_PRESS_BG } from '@/components/admin/clarityTokens';
import Colors from '@/constants/Colors';
import { FONT_SANS } from '@/constants/Fonts';
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
  const titleColor = destructive ? c.red700 : c.ink900;
  const subColor = destructive ? c.red700 : c.ink500;
  const iconTint = destructive ? c.red700 : c.azure600;
  const wrapBg = destructive ? c.red100 : c.azure50;

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
        pressed && onPress && !disabled ? { backgroundColor: CLARITY_ROW_PRESS_BG } : null,
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
        <Text style={[CLARITY_BODY, styles.title, { color: titleColor, fontFamily: FONT_SANS.regular }]}>{title}</Text>
        {subtitle ? (
          <Text style={[CLARITY_HINT, styles.sub, { color: subColor }]}>{subtitle}</Text>
        ) : null}
      </View>
      {detail ? (
        <Text style={[styles.detail, { color: c.ink500, fontFamily: FONT_SANS.regular }]} numberOfLines={1}>
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
    minHeight: 52,
    paddingVertical: 11,
    paddingHorizontal: 16,
    gap: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: { flex: 1, minWidth: 0 },
  title: { fontSize: 16 },
  sub: { marginTop: 2 },
  detail: { fontSize: 15, maxWidth: '36%' },
  chev: { marginLeft: 2 },
});

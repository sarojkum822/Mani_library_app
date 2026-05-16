import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { useAdminPalette } from '@/components/admin/clarityTokens';

type Props = {
  title: string;
  subtitle?: string;
  detail?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  last?: boolean;
  style?: ViewStyle;
};

/** Standard admin list row — grouped table with ink hover wash. */
export function AdminListRow({
  title,
  subtitle,
  detail,
  left,
  right,
  onPress,
  showChevron = !!onPress,
  last = false,
  style,
}: Props) {
  const c = useAdminPalette();

  const inner = (
    <>
      {left ? <View style={styles.left}>{left}</View> : null}
      <View style={styles.main}>
        <Text style={[styles.title, { color: c.ink900 }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: c.ink500 }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {detail ? (
        <Text style={[styles.detail, { color: c.ink900 }]} numberOfLines={1}>
          {detail}
        </Text>
      ) : null}
      {right ? <View style={styles.right}>{right}</View> : null}
      {showChevron && onPress ? (
        <FontAwesome name="chevron-right" size={12} color={c.ink400} style={styles.chevron} />
      ) : null}
    </>
  );

  const rowStyle = [styles.row, { borderBottomColor: c.border }, last && styles.last, style];

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          rowStyle,
          pressed ? { backgroundColor: c.ink50, opacity: 0.96 } : null,
        ]}
      >
        {inner}
      </Pressable>
    );
  }

  return <View style={rowStyle}>{inner}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  last: { borderBottomWidth: 0 },
  left: { flexShrink: 0 },
  main: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontSize: 16, fontWeight: '600', letterSpacing: -0.2 },
  subtitle: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  detail: {
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    flexShrink: 0,
  },
  right: { flexShrink: 0 },
  chevron: { marginLeft: 2, flexShrink: 0 },
});

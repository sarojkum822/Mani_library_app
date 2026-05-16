import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { CLARITY_BUTTON_RADIUS, CLARITY_MIN_TOUCH } from '@/components/admin/clarityTokens';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

type Props = {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  style?: ViewStyle;
  disabled?: boolean;
};

export function Button({ title, onPress, variant = 'primary', style, disabled }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  const containerStyle =
    variant === 'primary'
      ? { backgroundColor: c.azure500, borderColor: c.azure500 }
      : variant === 'secondary'
        ? { backgroundColor: c.surface, borderColor: c.borderStrong }
        : { backgroundColor: 'transparent', borderColor: 'transparent' };

  const textStyle =
    variant === 'primary' ? { color: '#fff' } : variant === 'secondary' ? { color: c.ink900 } : { color: c.azure600 };

  return (
    <Pressable
      accessibilityRole="button"
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        containerStyle,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      <Text style={[styles.text, textStyle]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: CLARITY_BUTTON_RADIUS,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: CLARITY_MIN_TOUCH,
  },
  text: { fontSize: 15, fontWeight: '600' },
  pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.5 },
});


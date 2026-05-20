import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { CLARITY_BUTTON_RADIUS, CLARITY_BUTTON_TEXT, CLARITY_MIN_TOUCH } from '@/components/admin/clarityTokens';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

type Props = {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  style?: ViewStyle;
  disabled?: boolean;
  loading?: boolean;
};

export function Button({ title, onPress, variant = 'primary', style, disabled, loading }: Props) {
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

  const busy = Boolean(loading);
  const inactive = disabled || busy;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy }}
      onPress={inactive ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        containerStyle,
        pressed && !inactive ? styles.pressed : null,
        inactive ? styles.disabled : null,
        style,
      ]}
    >
      {busy ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator
            size="small"
            color={variant === 'primary' ? '#fff' : c.azure500}
            style={styles.spinner}
          />
          <Text style={[CLARITY_BUTTON_TEXT, textStyle]}>{title}</Text>
        </View>
      ) : (
        <Text style={[CLARITY_BUTTON_TEXT, textStyle]}>{title}</Text>
      )}
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
  pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.5 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  spinner: { marginRight: 10 },
});


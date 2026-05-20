import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import Colors from '@/constants/Colors';
import { FONT_MONO, FONT_SANS } from '@/constants/Fonts';
import { useColorScheme } from '@/components/useColorScheme';

type Props = {
  label: string;
  /** `auth` matches web login/register field labels */
  variant?: 'default' | 'auth';
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'number-pad' | 'phone-pad';
  maxLength?: number;
  onBlur?: () => void;
};

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize = 'none',
  keyboardType = 'default',
  maxLength,
  onBlur,
  variant = 'default',
}: Props) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const auth = variant === 'auth';

  return (
    <View style={styles.wrap}>
      <Text
        style={[
          auth ? styles.authLabel : styles.label,
          { color: auth ? c.ink500 : c.ink700 },
        ]}
      >
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.ink400}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        maxLength={maxLength}
        onBlur={onBlur}
        style={[
          auth ? styles.authInput : styles.input,
          { backgroundColor: c.surface, borderColor: auth ? c.ink200 : c.border, color: c.ink900 },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', fontFamily: FONT_SANS.semibold },
  authLabel: {
    fontSize: 10,
    fontFamily: FONT_MONO.semibold,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    minHeight: 48,
    fontSize: 15,
    fontFamily: FONT_SANS.regular,
  },
  authInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
    fontSize: 14,
    fontFamily: FONT_SANS.regular,
  },
});


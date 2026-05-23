import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import Colors from '@/constants/Colors';
import { FONT_MONO, FONT_SANS } from '@/constants/Fonts';
import { useColorScheme } from '@/components/useColorScheme';
import { stripIndianPhoneInput } from '@/lib/indianPhone';

type Props = {
  label?: string;
  value: string;
  onChangeText: (digits: string) => void;
  variant?: 'default' | 'auth';
  optionalLabel?: string;
};

export function IndianPhoneField({
  label = 'Phone',
  value,
  onChangeText,
  variant = 'auth',
  optionalLabel,
}: Props) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const auth = variant === 'auth';

  return (
    <View style={styles.wrap}>
      <Text style={[auth ? styles.authLabel : styles.label, { color: auth ? c.ink500 : c.ink700 }]}>
        {label}
        {optionalLabel ? (
          <Text style={styles.optional}> {optionalLabel}</Text>
        ) : null}
      </Text>
      <View style={[styles.row, { borderColor: c.ink200, backgroundColor: c.surface }]}>
        <View style={[styles.prefix, { borderColor: c.ink200, backgroundColor: c.ink50 }]}>
          <Text style={[styles.prefixText, { color: c.ink600 }]}>+91</Text>
        </View>
        <TextInput
          value={value}
          onChangeText={(t) => onChangeText(stripIndianPhoneInput(t))}
          placeholder="9876543210"
          placeholderTextColor={c.ink400}
          keyboardType="phone-pad"
          maxLength={10}
          style={[styles.input, { color: c.ink900 }]}
        />
      </View>
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
  optional: {
    fontFamily: FONT_SANS.regular,
    textTransform: 'none',
    letterSpacing: 0,
    fontSize: 10,
    color: '#9ca3af',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  prefix: {
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRightWidth: 1,
  },
  prefixText: { fontSize: 14, fontFamily: FONT_MONO.semibold },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: FONT_SANS.regular,
  },
});

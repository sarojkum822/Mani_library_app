import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import Colors from '@/constants/Colors';
import { FONT_MONO, FONT_SANS } from '@/constants/Fonts';
import { useColorScheme } from '@/components/useColorScheme';

type Props = {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  maxLength?: number;
};

export function AuthPasswordField({
  label = 'Password',
  value,
  onChangeText,
  placeholder = '••••••••',
  maxLength,
}: Props) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [show, setShow] = useState(false);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: c.ink500 }]}>{label}</Text>
      <View style={[styles.inputWrap, { backgroundColor: c.surface, borderColor: c.ink200 }]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={c.ink400}
          secureTextEntry={!show}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="password"
          maxLength={maxLength}
          style={[styles.input, { color: c.ink900 }]}
        />
        <Pressable
          onPress={() => setShow((s) => !s)}
          hitSlop={8}
          style={({ pressed }) => [styles.eyeBtn, pressed ? { opacity: 0.65 } : null]}
          accessibilityRole="button"
          accessibilityLabel={show ? 'Hide password' : 'Show password'}
        >
          <FontAwesome name={show ? 'eye-slash' : 'eye'} size={18} color={c.ink500} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: {
    fontSize: 10,
    fontFamily: FONT_MONO.semibold,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 48,
    paddingLeft: 16,
    paddingRight: 4,
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 12,
    paddingRight: 8,
    fontSize: 14,
    fontFamily: FONT_SANS.regular,
  },
  eyeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

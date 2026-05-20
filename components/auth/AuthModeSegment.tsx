import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { FONT_SANS } from '@/constants/Fonts';
import { useColorScheme } from '@/components/useColorScheme';

export type AuthMode = 'signin' | 'signup';

type Props = {
  mode: AuthMode;
  onChange: (mode: AuthMode) => void;
};

export function AuthModeSegment({ mode, onChange }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  return (
    <View style={[styles.track, { backgroundColor: c.surfaceMuted, borderColor: c.border }]}>
      {(['signin', 'signup'] as const).map((id) => {
        const active = mode === id;
        const label = id === 'signin' ? 'Sign in' : 'Sign up';
        return (
          <Pressable
            key={id}
            onPress={() => onChange(id)}
            style={({ pressed }) => [
              styles.segment,
              active && { backgroundColor: c.surface, borderColor: c.border },
              pressed && !active ? { opacity: 0.75 } : null,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={label}
          >
            <Text
              style={[
                styles.segmentText,
                { color: active ? c.ink900 : c.ink500 },
                active && styles.segmentTextActive,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: 999,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    minHeight: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: 14,
    fontFamily: FONT_SANS.regular,
  },
  segmentTextActive: {
    fontFamily: FONT_SANS.semibold,
  },
});

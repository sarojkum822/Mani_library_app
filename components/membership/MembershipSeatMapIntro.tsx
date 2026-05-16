import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

/** Plain-language seat-map primer (matches website `MembershipSeatMapIntro`). */
export function MembershipSeatMapIntro() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  return (
    <View style={[styles.box, { borderColor: c.border, backgroundColor: c.surface }]}>
      <Text style={[styles.kicker, { color: c.ink500 }]}>How to read this map</Text>
      <Text style={[styles.body, { color: c.ink600 }]}>
        <Text style={[styles.strong, { color: c.ink800 }]}>White</Text> desks with a{' '}
        <Text style={[styles.strong, { color: c.ink800 }]}>light blue border</Text> are empty and available.{' '}
        <Text style={[styles.strong, { color: c.ink800 }]}>Amber</Text> seats are already booked. Desks with a{' '}
        <Text style={[styles.strong, { color: c.ink800 }]}>×</Text> are blocked—not serviceable or not sold.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 14, marginBottom: 12 },
  kicker: { fontSize: 10, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' },
  body: { marginTop: 8, fontSize: 13, lineHeight: 19, fontWeight: '500' },
  strong: { fontWeight: '700' },
});

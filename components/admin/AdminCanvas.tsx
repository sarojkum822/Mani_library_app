import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { ADMIN_CANVAS_GRADIENT } from '@/components/admin/adminGlassTheme';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Brand-tinted admin backdrop (replaces flat surfaceMuted). */
export function AdminCanvas({ children, style }: Props) {
  return (
    <View style={[styles.root, style]}>
      <LinearGradient
        colors={[...ADMIN_CANVAS_GRADIENT]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: '100%', minWidth: 0 },
  content: { flex: 1, minWidth: 0, backgroundColor: 'transparent' },
});

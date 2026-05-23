import React from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  type RefreshControlProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { rhythm, type as typeScale } from '@/constants/Typography';
import { useColorScheme } from '@/components/useColorScheme';
import { cardElevation } from '@/lib/platformStyles';

export function Screen({
  title,
  subtitle,
  children,
  padded = true,
  background = 'muted',
  right,
  scrollable = true,
  refreshControl,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  padded?: boolean;
  background?: 'surface' | 'muted';
  right?: React.ReactNode;
  /** When false, use a plain body View (use if the screen nests its own ScrollView). Default true enables scroll/wheel on web (matches ScrollViewStyleReset). */
  scrollable?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
}) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  const bg = background === 'surface' ? c.surface : c.surfaceMuted;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={['top', 'left', 'right']}>
      {title ? (
        <View style={[styles.header, { borderBottomColor: c.border, backgroundColor: c.surface }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: c.ink900 }]}>{title}</Text>
            {subtitle ? <Text style={[styles.subtitle, { color: c.ink600 }]}>{subtitle}</Text> : null}
          </View>
          {right ? <View style={styles.right}>{right}</View> : null}
        </View>
      ) : null}

      {scrollable ? (
        <ScrollView
          style={styles.body}
          contentContainerStyle={[padded ? [styles.padded, styles.paddedComfort] : null, styles.scrollContent]}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.body, padded ? [styles.padded, styles.paddedComfort] : null]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export const spacing = {
  page: 16,
  gap: 12,
  sectionTop: rhythm.sectionTop,
};

export const textStyles = StyleSheet.create({
  kicker: { fontSize: 10, fontWeight: '600', letterSpacing: 1.4, textTransform: 'uppercase' },
  body: { fontSize: 14, fontWeight: '500' },
  label: { fontSize: 13, fontWeight: '500' },
  value: { fontSize: 17, fontWeight: '600' },
});

export function shadowCard(): ViewStyle {
  return cardElevation();
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: spacing.page,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  right: { alignItems: 'flex-end', justifyContent: 'center' },
  title: { ...typeScale.screenTitle, letterSpacing: -0.25, textAlign: 'left' },
  subtitle: { marginTop: 6, ...typeScale.caption, fontWeight: '500', textAlign: 'left' },
  body: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  padded: { paddingHorizontal: spacing.page },
  paddedComfort: { paddingTop: 20, paddingBottom: 28 },
});


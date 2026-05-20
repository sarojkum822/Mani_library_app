import { Platform } from 'react-native';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { FONT_SANS } from '@/constants/Fonts';

type Scheme = keyof typeof Colors;

type Options = {
  headerBackTitle?: string;
};

/** Stack headers + content for Android edge-to-edge (status bar must not overlap title). */
export function useNativeStackScreenOptions(
  scheme: Scheme,
  options?: Options,
): NativeStackNavigationOptions {
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();
  const statusBarHeight = Platform.OS === 'android' ? Math.max(insets.top, 24) : insets.top;

  return {
    headerShown: true,
    headerBackTitle: options?.headerBackTitle,
    headerTintColor: c.azure500,
    headerTitleStyle: { color: c.ink900, fontFamily: FONT_SANS.semibold, fontSize: 17 },
    headerStyle: { backgroundColor: c.surface },
    headerShadowVisible: false,
    contentStyle: { backgroundColor: c.surfaceMuted },
    ...(Platform.OS === 'android'
      ? {
          headerStatusBarHeight: statusBarHeight,
          statusBarStyle: 'dark' as const,
        }
      : null),
  };
}

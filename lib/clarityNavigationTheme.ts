import { DefaultTheme, type Theme } from '@react-navigation/native';

import Colors from '@/constants/Colors';
import { FONT_SANS } from '@/constants/Fonts';

const c = Colors.light;

/** React Navigation theme aligned with Clarity UI / Electric Azure. */
export const ClarityNavigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: c.azure500,
    background: c.surfaceMuted,
    card: c.surface,
    text: c.ink900,
    border: c.border,
    notification: c.azure500,
  },
  fonts: {
    ...DefaultTheme.fonts,
    regular: { fontFamily: FONT_SANS.regular, fontWeight: '400' },
    medium: { fontFamily: FONT_SANS.medium, fontWeight: '500' },
    bold: { fontFamily: FONT_SANS.bold, fontWeight: '700' },
    heavy: { fontFamily: FONT_SANS.bold, fontWeight: '700' },
  },
};

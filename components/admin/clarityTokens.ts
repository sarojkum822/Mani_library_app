/**
 * Clarity UI tokens for staff admin — mirrors manilibrary globals.css / Colors.ts.
 * Use these helpers so iOS and Android share the same card, type, and chrome.
 */

import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import Colors from '@/constants/Colors';
import { cardElevation } from '@/lib/platformStyles';
import { useColorScheme } from '@/components/useColorScheme';

/** Card radius (rounded-2xl ≈ 16px). */
export const CLARITY_CARD_RADIUS = 16;

/** Primary button / control radius. */
export const CLARITY_BUTTON_RADIUS = 12;

/** Search fields, small inputs. */
export const CLARITY_INPUT_RADIUS = 10;

/** Icon chips in KPI tiles. */
export const CLARITY_CHIP_RADIUS = 10;

/** Card interior padding (p-5). */
export const CLARITY_CARD_PADDING = 20;

/** 10px ALL CAPS metric labels with wide tracking. */
export const CLARITY_METRIC_LABEL: TextStyle = {
  fontSize: 10,
  fontWeight: '600',
  letterSpacing: 1.7,
  textTransform: 'uppercase',
};

/** Large KPI / money values. */
export const CLARITY_KPI_VALUE: TextStyle = {
  fontSize: 28,
  fontWeight: '700',
  letterSpacing: -0.8,
  fontVariant: ['tabular-nums'],
};

/** Section titles inside cards. */
export const CLARITY_SECTION_TITLE: TextStyle = {
  fontSize: 17,
  fontWeight: '600',
  letterSpacing: -0.3,
};

export type AdminPalette = (typeof Colors)['light'];

export function useAdminPalette(): AdminPalette {
  const scheme = useColorScheme() ?? 'light';
  return Colors[scheme];
}

/** White card: hairline border + brand shadow (iOS shadow + Android elevation). */
export function adminCardChrome(c: AdminPalette): ViewStyle {
  return {
    backgroundColor: c.surface,
    borderColor: c.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: CLARITY_CARD_RADIUS,
    ...cardElevation(),
  };
}

/** Chart wells, nested panels. */
export function adminSunkenChrome(c: AdminPalette): ViewStyle {
  return {
    backgroundColor: c.surfaceSunken,
    borderColor: c.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: CLARITY_CARD_RADIUS,
  };
}

/** Search affordance — same on iOS and Android (muted fill + hairline). */
export function adminSearchChrome(c: AdminPalette): ViewStyle {
  return {
    backgroundColor: c.surfaceMuted,
    borderColor: c.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: CLARITY_INPUT_RADIUS,
  };
}

/** Empty / placeholder panels. */
export function adminEmptyChrome(c: AdminPalette): ViewStyle {
  return {
    backgroundColor: c.surface,
    borderColor: c.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: CLARITY_CARD_RADIUS,
    borderStyle: 'dashed',
  };
}

/** Minimum comfortable tap target (HIG / Material). */
export const CLARITY_MIN_TOUCH = 44;

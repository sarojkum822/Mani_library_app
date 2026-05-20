/**
 * Clarity UI tokens for staff admin — mirrors manilibrary globals.css / Colors.ts.
 * Use these helpers so iOS and Android share the same card, type, and chrome.
 */

import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import Colors from '@/constants/Colors';
import { FONT_MONO, FONT_SANS } from '@/constants/Fonts';
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

/** Small chips / toggles. */
export const CLARITY_CHIP_XS_RADIUS = 6;

/** Card interior padding (p-5). */
export const CLARITY_CARD_PADDING = 20;

/** ink-50 at 60% — row hover without dimming label text. */
export const CLARITY_ROW_PRESS_BG = 'rgba(247, 249, 252, 0.6)';

/** 10px ALL CAPS metric labels — 0.17em tracking on 10px. */
export const CLARITY_METRIC_LABEL: TextStyle = {
  fontFamily: FONT_SANS.semibold,
  fontSize: 10,
  letterSpacing: 1.7,
  textTransform: 'uppercase',
};

/** Large KPI / money values — tabular, -0.03em tracking. */
export const CLARITY_KPI_VALUE: TextStyle = {
  fontFamily: FONT_SANS.bold,
  fontSize: 28,
  letterSpacing: -0.84,
  fontVariant: ['tabular-nums'],
};

/** Page title — 24–32px bold, -0.02em tracking. */
export function clarityPageTitle(size: number): TextStyle {
  return {
    fontFamily: FONT_SANS.bold,
    fontSize: size,
    letterSpacing: -(size * 0.025),
  };
}

/** Section titles inside cards — 14–16px semibold. */
export const CLARITY_SECTION_TITLE: TextStyle = {
  fontFamily: FONT_SANS.semibold,
  fontSize: 16,
  letterSpacing: -0.2,
};

/** Body copy — 14–15px regular. */
export const CLARITY_BODY: TextStyle = {
  fontFamily: FONT_SANS.regular,
  fontSize: 15,
  lineHeight: 22,
};

export const CLARITY_BODY_SM: TextStyle = {
  fontFamily: FONT_SANS.regular,
  fontSize: 14,
  lineHeight: 20,
};

/** Hint / meta — 11–13px. */
export const CLARITY_HINT: TextStyle = {
  fontFamily: FONT_SANS.regular,
  fontSize: 12,
  lineHeight: 16,
};

export const CLARITY_HINT_META: TextStyle = {
  fontFamily: FONT_SANS.medium,
  fontSize: 13,
  lineHeight: 18,
};

/** Sidebar / nav label. */
export const CLARITY_NAV_LABEL: TextStyle = {
  fontFamily: FONT_SANS.semibold,
  fontSize: 14,
};

/** Grouped list primary line. */
export const CLARITY_LIST_TITLE: TextStyle = {
  fontFamily: FONT_SANS.semibold,
  fontSize: 16,
  letterSpacing: -0.2,
};

/** Tabular detail column. */
export const CLARITY_LIST_DETAIL: TextStyle = {
  fontFamily: FONT_SANS.semibold,
  fontSize: 15,
  fontVariant: ['tabular-nums'],
};

/** Primary / secondary buttons. */
export const CLARITY_BUTTON_TEXT: TextStyle = {
  fontFamily: FONT_SANS.semibold,
  fontSize: 15,
};

/** IDs, emails, receipts — JetBrains Mono. */
export const CLARITY_MONO: TextStyle = {
  fontFamily: FONT_MONO.regular,
  fontSize: 14,
};

export const CLARITY_MONO_SM: TextStyle = {
  fontFamily: FONT_MONO.semibold,
  fontSize: 11,
  lineHeight: 16,
};

export const CLARITY_MONO_KPI: TextStyle = {
  fontFamily: FONT_MONO.bold,
  fontSize: 15,
  letterSpacing: 0.3,
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

/** Search affordance — muted fill + hairline. */
export function adminSearchChrome(c: AdminPalette): ViewStyle {
  return {
    backgroundColor: c.surfaceMuted,
    borderColor: c.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: CLARITY_INPUT_RADIUS,
  };
}

/** Empty / placeholder panels — dashed border. */
export function adminEmptyChrome(c: AdminPalette): ViewStyle {
  return {
    backgroundColor: c.surface,
    borderColor: c.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: CLARITY_CARD_RADIUS,
    borderStyle: 'dashed',
  };
}

/** Focus ring — azure 18% (matches --shadow-focus). */
export function clarityFocusRing(c: AdminPalette): ViewStyle {
  return {
    borderColor: c.azure500,
    borderWidth: 1,
    shadowColor: c.azure500,
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  };
}

/** Minimum comfortable tap target (HIG / Material). */
export const CLARITY_MIN_TOUCH = 44;

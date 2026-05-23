import { Platform, StyleSheet, type ViewStyle } from 'react-native';

import { ADMIN_GROUP_RADIUS } from '@/components/admin/layoutTokens';
import Colors from '@/constants/Colors';

type AdminPalette = (typeof Colors)['light'];

const CARD_RADIUS = ADMIN_GROUP_RADIUS;
const INPUT_RADIUS = 10;

/** Soft brand wash behind admin screens (not flat gray). */
export const ADMIN_CANVAS_GRADIENT = ['#E6F0FB', '#F4F8FC', '#F7F9FC'] as const;

export type AdminGlassAccent = 'default' | 'revenue' | 'success';

function cardFill(accent: AdminGlassAccent): string {
  if (accent === 'revenue') return 'rgba(255, 255, 255, 0.82)';
  if (accent === 'success') return 'rgba(255, 255, 255, 0.8)';
  return 'rgba(255, 255, 255, 0.74)';
}

function cardWash(accent: AdminGlassAccent): string | undefined {
  if (accent === 'revenue') return 'rgba(1, 96, 208, 0.06)';
  if (accent === 'success') return 'rgba(4, 120, 87, 0.05)';
  return undefined;
}

export function adminGlassShadow(): ViewStyle {
  if (Platform.OS === 'android') {
    return {};
  }
  return {
    shadowColor: '#101828',
    shadowOpacity: 0.06,
    shadowRadius: 2.5,
    shadowOffset: { width: 0, height: 1 },
  };
}

/** Frosted KPI / section cards. */
export function adminGlassCardChrome(c: AdminPalette, accent: AdminGlassAccent = 'default'): ViewStyle {
  const wash = cardWash(accent);
  return {
    backgroundColor: wash ?? cardFill(accent),
    borderColor: 'rgba(1, 96, 208, 0.1)',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    ...adminGlassShadow(),
  };
}

/** Top bar + bottom tab bar — light frosted strip. */
export function adminGlassBarChrome(c: AdminPalette): ViewStyle {
  return {
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderColor: 'rgba(1, 96, 208, 0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    ...adminGlassShadow(),
  };
}

export function adminGlassSearchChrome(_c: AdminPalette): ViewStyle {
  return {
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    borderColor: 'rgba(1, 96, 208, 0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: INPUT_RADIUS,
  };
}

export function adminGlassIconWell(c: AdminPalette, accent: AdminGlassAccent = 'default'): ViewStyle {
  const bg =
    accent === 'revenue'
      ? 'rgba(1, 96, 208, 0.12)'
      : accent === 'success'
        ? 'rgba(4, 120, 87, 0.1)'
        : 'rgba(1, 96, 208, 0.06)';
  return {
    backgroundColor: bg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(1, 96, 208, 0.08)',
  };
}

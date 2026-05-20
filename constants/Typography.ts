/**
 * Shared type scale — student + auth flows (Clarity / Inter).
 */

import { FONT_SANS } from '@/constants/Fonts';

export const type = {
  display: { fontFamily: FONT_SANS.bold, fontSize: 34, lineHeight: 40 },
  screenTitle: { fontFamily: FONT_SANS.semibold, fontSize: 20, lineHeight: 26 },
  subtitle: { fontFamily: FONT_SANS.medium, fontSize: 14, lineHeight: 20 },
  headline: { fontFamily: FONT_SANS.semibold, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: FONT_SANS.regular, fontSize: 15, lineHeight: 22 },
  bodyMedium: { fontFamily: FONT_SANS.medium, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: FONT_SANS.medium, fontSize: 13, lineHeight: 18 },
  mini: { fontFamily: FONT_SANS.medium, fontSize: 12, lineHeight: 17 },
} as const;

export const rhythm = {
  sectionTop: 28,
};

/**
 * Shared type scale — student + auth flows (Clarity / Inter).
 */

import { FONT_SANS } from '@/constants/Fonts';

/** +1px readable scale (body 16, screen title 22). */
export const type = {
  display: { fontFamily: FONT_SANS.bold, fontSize: 36, lineHeight: 44 },
  screenTitle: { fontFamily: FONT_SANS.semibold, fontSize: 22, lineHeight: 28 },
  subtitle: { fontFamily: FONT_SANS.medium, fontSize: 15, lineHeight: 21 },
  headline: { fontFamily: FONT_SANS.semibold, fontSize: 19, lineHeight: 26 },
  body: { fontFamily: FONT_SANS.regular, fontSize: 16, lineHeight: 24 },
  bodyMedium: { fontFamily: FONT_SANS.medium, fontSize: 16, lineHeight: 24 },
  caption: { fontFamily: FONT_SANS.medium, fontSize: 14, lineHeight: 20 },
  mini: { fontFamily: FONT_SANS.medium, fontSize: 13, lineHeight: 18 },
} as const;

export const rhythm = {
  sectionTop: 28,
};

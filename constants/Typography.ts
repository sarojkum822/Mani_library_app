/**
 * Shared type scale — use for hierarchy on student + auth flows.
 */

export const type = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '600' as const },
  screenTitle: { fontSize: 20, lineHeight: 26, fontWeight: '600' as const },
  subtitle: { fontSize: 14, lineHeight: 20, fontWeight: '500' as const },
  headline: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const },
  bodyMedium: { fontSize: 15, lineHeight: 22, fontWeight: '500' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const },
  mini: { fontSize: 12, lineHeight: 17, fontWeight: '500' as const },
} as const;

export const rhythm = {
  /** Space above major section kicks (matching 8px grid × 4) */
  sectionTop: 28,
};

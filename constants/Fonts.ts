/**
 * Clarity UI fonts — mirrors manilibrary Inter + JetBrains Mono (globals.css).
 * Each weight is a separate family (React Native requirement).
 */

export const FONT_SANS = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const FONT_MONO = {
  regular: 'JetBrainsMono_400Regular',
  medium: 'JetBrainsMono_500Medium',
  semibold: 'JetBrainsMono_600SemiBold',
  bold: 'JetBrainsMono_700Bold',
} as const;

export type SansWeight = keyof typeof FONT_SANS;
export type MonoWeight = keyof typeof FONT_MONO;

/** Default UI sans — Inter Regular. */
export const FONT_SANS_DEFAULT = FONT_SANS.regular;

/** Default mono — JetBrains Mono Regular. */
export const FONT_MONO_DEFAULT = FONT_MONO.regular;

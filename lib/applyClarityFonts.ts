import { Text, TextInput } from 'react-native';

import { FONT_SANS_DEFAULT } from '@/constants/Fonts';

/** Apply Inter as the default UI face after expo-font loads. */
export function applyClarityFontDefaults() {
  const textDefaults = (Text as unknown as { defaultProps?: { style?: unknown } }).defaultProps ?? {};
  (Text as unknown as { defaultProps: { style?: unknown } }).defaultProps = {
    ...textDefaults,
    style: [{ fontFamily: FONT_SANS_DEFAULT }, textDefaults.style],
  };

  const inputDefaults = (TextInput as unknown as { defaultProps?: { style?: unknown } }).defaultProps ?? {};
  (TextInput as unknown as { defaultProps: { style?: unknown } }).defaultProps = {
    ...inputDefaults,
    style: [{ fontFamily: FONT_SANS_DEFAULT }, inputDefaults.style],
  };
}

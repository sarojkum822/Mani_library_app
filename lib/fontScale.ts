import { PixelRatio } from 'react-native';

/** Map admin font sizes to the user’s Dynamic Type / font scale (iOS Settings → Display → Text Size). */
export function scaled(size: number): number {
  return Math.round(size * PixelRatio.getFontScale());
}

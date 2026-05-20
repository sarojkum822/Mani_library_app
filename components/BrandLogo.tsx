import {
  Image,
  StyleSheet,
  Text,
  View,
  type ImageStyle,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

const BRAND_NAV_LOGO = require('@/assets/images/brand-navlogo.png');
const BRAND_MARK = require('@/assets/images/icon.png');

/** Horizontal nav logo aspect (brand-navlogo.png). */
const NAV_LOGO_ASPECT = 300 / 88;

export type BrandLogoProps = {
  /** `full` = MANI LIBRARY wordmark; `mark` = reader icon for compact rows */
  variant?: 'full' | 'mark';
  height?: number;
  /** Only with `mark`: show “Mani Library” to the right */
  withTitle?: boolean;
  titleColor?: string;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  titleStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
};

export function BrandLogo({
  variant = 'full',
  height = 28,
  withTitle = false,
  titleColor = '#111827',
  style,
  imageStyle,
  titleStyle,
  accessibilityLabel = 'Mani Library',
}: BrandLogoProps) {
  if (variant === 'mark' && withTitle) {
    const markSize = height;
    return (
      <View
        style={[styles.row, style]}
        accessibilityRole="header"
        accessibilityLabel={accessibilityLabel}
      >
        <Image
          source={BRAND_MARK}
          style={[
            { width: markSize, height: markSize, borderRadius: markSize * 0.2 },
            imageStyle,
          ]}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
        <Text
          style={[styles.title, { color: titleColor, fontSize: Math.round(height * 0.5) }, titleStyle]}
          numberOfLines={1}
        >
          Mani Library
        </Text>
      </View>
    );
  }

  const source = variant === 'mark' ? BRAND_MARK : BRAND_NAV_LOGO;
  const width = variant === 'mark' ? height : height * NAV_LOGO_ASPECT;

  const image = (
    <Image
      source={source}
      style={[{ width, height }, imageStyle]}
      resizeMode="contain"
      accessibilityLabel={accessibilityLabel}
      accessibilityIgnoresInvertColors
    />
  );

  if (style) {
    return <View style={style}>{image}</View>;
  }

  return image;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1, minWidth: 0 },
  title: { fontWeight: '600', letterSpacing: -0.2, flexShrink: 1 },
});

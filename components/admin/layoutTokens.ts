import { Platform } from 'react-native';

/**
 * Shared admin chrome metrics so the top bar, menu sheet, and sidebar stay on one grid on every iPhone size.
 */

/** Minimum horizontal inset from the safe layout edge (matches top bar `paddingHorizontal`). */
export const ADMIN_GUTTER = 16;

/** Content inset for scrollable admin screens — aligns with iOS default margins (~16pt). */
export const ADMIN_SCREEN_INSET = 16;

/** Vertical gap between major sections on a screen. */
export const ADMIN_SECTION_GAP = 16;

/** Corner radius for grouped lists / cards — Clarity UI card (16px). */
export const ADMIN_GROUP_RADIUS = 16;

/**
 * Standard `contentContainerStyle` padding for admin `ScrollView` / `FlatList`.
 * Respects home indicator; use with `useSafeAreaInsets().bottom`.
 */
/** Space below the fixed admin top bar before screen titles (Android needs a bit more). */
export const ADMIN_CONTENT_TOP_PAD = Platform.OS === 'android' ? 12 : 8;

export function adminScrollContentInsets(safeBottom: number, gap: number = ADMIN_SECTION_GAP) {
  return {
    paddingHorizontal: ADMIN_SCREEN_INSET,
    paddingTop: ADMIN_CONTENT_TOP_PAD,
    paddingBottom: Math.max(safeBottom, 8) + 28,
    gap,
  };
}

/** Single row height for icon buttons + search field (vertical alignment). */
export const ADMIN_ROW_HEIGHT = 40;

/** Sidebar nav: icon size (must match `FontAwesome` `size` in rows). */
export const ADMIN_NAV_ICON_SIZE = 18;

/** Gap between icon and label — logo row uses the same gap so “Mani Library” lines up with “Overview”. */
export const ADMIN_NAV_ICON_GAP = 12;

/** Extra inset from the gutter to where nav label text starts (= icon width + gap). */
export const ADMIN_NAV_LABEL_INSET = ADMIN_NAV_ICON_SIZE + ADMIN_NAV_ICON_GAP;

/** Apple HIG minimum comfortable tap target (points). */
export const ADMIN_NAV_MIN_TOUCH = 44;

/** Vertical gap between sidebar nav rows — readable separation between 44pt targets. */
export const ADMIN_NAV_ROW_GAP = 18;

/** Extra space above a new nav section (e.g. between “workspace” and “settings” groups). */
export const ADMIN_NAV_SECTION_TOP_GAP = 36;

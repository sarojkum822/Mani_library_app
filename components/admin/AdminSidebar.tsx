import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link, useSegments } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { useAuth } from '@/components/auth/AuthProvider';
import { BrandLogo } from '@/components/BrandLogo';
import Colors from '@/constants/Colors';
import { CLARITY_METRIC_LABEL, CLARITY_NAV_LABEL } from '@/components/admin/clarityTokens';
import {
  ADMIN_GUTTER,
  ADMIN_NAV_ICON_GAP,
  ADMIN_NAV_ICON_SIZE,
  ADMIN_NAV_LABEL_INSET,
  ADMIN_NAV_MIN_TOUCH,
  ADMIN_NAV_ROW_GAP,
  ADMIN_NAV_SECTION_TOP_GAP,
} from '@/components/admin/layoutTokens';
import { useColorScheme } from '@/components/useColorScheme';
import { ADMIN_NAV, type AdminNavItem } from '@/components/admin/navigation';

/** Segment after `(admin)` — matches web dashboard routes. */
function adminLeaf(segments: string[]): string | undefined {
  const i = segments.indexOf('(admin)');
  const rest = i >= 0 ? segments.slice(i + 1) : segments;
  return rest[0];
}

function isNavActive(segments: string[], item: AdminNavItem): boolean {
  const leaf = adminLeaf(segments);
  switch (item.key) {
    case 'overview':
      return leaf === undefined || leaf === 'index';
    case 'members':
      return leaf === 'members' || leaf === 'member';
    case 'payments':
      return leaf === 'payments';
    case 'attendance':
      return leaf === 'attendance';
    case 'subscriptions':
      return leaf === 'subscriptions';
    case 'documents':
      return leaf === 'docs';
    case 'settings':
      return leaf === 'settings';
    default:
      return false;
  }
}

export function AdminSidebar({
  onNavigate,
  compact,
  variant = 'rail',
}: {
  onNavigate?: () => void;
  compact?: boolean;
  /** `rail` = fixed left column (tablet/desktop). `sheet` = full-width dropdown under top bar (phone). */
  variant?: 'rail' | 'sheet';
}) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const { auth } = useAuth();
  const footerEmail =
    auth.status === 'signed_in' && auth.user.email ? auth.user.email : 'Staff account';

  const workspace = useMemo(() => ADMIN_NAV.filter((i) => i.section === 'workspace'), []);
  const settings = useMemo(() => ADMIN_NAV.filter((i) => i.section === 'settings'), []);

  const glassSurface = 'rgba(255, 255, 255, 0.78)';
  const glassBorder = 'rgba(1, 96, 208, 0.1)';
  const shellStyle =
    variant === 'sheet'
      ? [styles.asideSheet, { borderBottomColor: glassBorder, backgroundColor: glassSurface }]
      : [styles.aside, { borderRightColor: glassBorder, backgroundColor: glassSurface }, compact && styles.asideCompact];

  const navInnerPad = variant === 'sheet' ? styles.navInnerSheet : styles.navInner;

  return (
    <View style={shellStyle}>
      <View
        style={[
          styles.logoRow,
          variant === 'sheet' && styles.logoRowSheet,
          variant === 'rail' && styles.logoRowRail,
          { borderBottomColor: c.border },
        ]}
      >
        <View style={styles.logoRowGrid}>
          <BrandLogo variant="full" height={24} />
        </View>
      </View>

      <ScrollView
        style={styles.navScroll}
        contentContainerStyle={[navInnerPad, variant === 'sheet' && styles.navInnerSheetGrow]}
        showsVerticalScrollIndicator={false}
      >
        <SectionLabel c={c} label="Workspace" first variant={variant} />
        <NavList c={c} items={workspace} segments={segments} onNavigate={onNavigate} variant={variant} />
        <View style={[styles.sectionDivider, { backgroundColor: c.border }]} accessibilityRole="none" />
        <SectionLabel c={c} label="Settings" afterDivider variant={variant} />
        <NavList c={c} items={settings} segments={segments} onNavigate={onNavigate} variant={variant} />
      </ScrollView>

      <View
        style={[
          styles.footer,
          variant === 'sheet' && styles.footerSheet,
          variant === 'sheet' && { paddingBottom: Math.max(insets.bottom, 12) },
          { borderTopColor: c.border },
        ]}
      >
        <Text style={[styles.footerHint, { color: c.ink500 }]} numberOfLines={1}>
          {footerEmail}
        </Text>
      </View>
    </View>
  );
}

function SectionLabel({
  label,
  c,
  first,
  afterDivider,
  variant,
}: {
  label: string;
  c: (typeof Colors)['light'];
  first?: boolean;
  /** Spacing tuned for use directly under `sectionDivider` (not `sectionFollowing`). */
  afterDivider?: boolean;
  variant?: 'rail' | 'sheet';
}) {
  /** Align with nav labels: scroll area already has horizontal gutter; indent = icon column + gap. */
  const alignWithLabels =
    variant === 'sheet' || variant === 'rail'
      ? { paddingLeft: ADMIN_NAV_LABEL_INSET, paddingRight: 0 }
      : null;

  return (
    <Text
      style={[
        CLARITY_METRIC_LABEL,
        styles.sectionLabel,
        variant === 'sheet' && styles.sectionLabelSheet,
        first ? styles.sectionFirst : afterDivider ? styles.sectionAfterDivider : styles.sectionFollowing,
        { color: variant === 'sheet' ? c.ink500 : c.ink400 },
        alignWithLabels,
      ]}
    >
      {label}
    </Text>
  );
}

function NavList({
  c,
  items,
  segments,
  onNavigate,
  variant,
}: {
  c: (typeof Colors)['light'];
  items: AdminNavItem[];
  segments: string[];
  onNavigate?: () => void;
  variant?: 'rail' | 'sheet';
}) {
  return (
    <View style={[styles.list, { gap: ADMIN_NAV_ROW_GAP }]}>
      {items.map((item) => {
        const active = isNavActive(segments, item);
        return (
          <Link key={item.key} href={item.href as any} onPress={onNavigate} asChild>
            <Pressable
              style={({ pressed }) => [
                styles.rowHit,
                variant === 'sheet' && styles.rowHitSheet,
                variant === 'rail' && styles.rowHitRail,
                { backgroundColor: active ? c.azure50 : 'transparent' },
                pressed ? { opacity: 0.88 } : null,
              ]}
            >
              {/* Inner row so icon + label stay horizontal even when Link/Pressable wrappers alter layout. */}
              <View style={styles.rowInner}>
                <View style={styles.iconColumn}>
                  <FontAwesome name={item.icon} size={ADMIN_NAV_ICON_SIZE} color={active ? c.azure500 : c.ink400} />
                </View>
                <Text style={[CLARITY_NAV_LABEL, styles.navLabel, { color: active ? c.azure700 : c.ink600 }]}>{item.label}</Text>
              </View>
            </Pressable>
          </Link>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  aside: {
    width: 256,
    borderRightWidth: 1,
    paddingBottom: 8,
  },
  asideSheet: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
    borderRightWidth: 0,
    borderBottomWidth: 0,
    overflow: 'hidden',
    /** Shell clips the sheet — no shadow/elevation so the layer can’t draw outside the clip. */
    elevation: 0,
  },
  asideCompact: {},
  logoRow: {
    minHeight: 52,
    paddingVertical: 10,
    justifyContent: 'center',
    borderBottomWidth: 1,
  },
  logoRowSheet: {
    paddingHorizontal: ADMIN_GUTTER,
    paddingVertical: 12,
    minHeight: 54,
  },
  logoRowRail: {
    paddingHorizontal: 16,
  },
  /** One horizontal line: fixed icon column + title (matches each nav row). */
  logoRowGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  iconColumn: {
    width: ADMIN_NAV_ICON_SIZE,
    marginRight: ADMIN_NAV_ICON_GAP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navScroll: { flex: 1 },
  navInner: { paddingHorizontal: 12, paddingVertical: 22, gap: 0 },
  navInnerSheet: {
    paddingHorizontal: ADMIN_GUTTER,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 0,
  },
  navInnerSheetGrow: { flexGrow: 1 },
  sectionLabel: {
    marginTop: 20,
    marginBottom: 16,
    paddingHorizontal: 0,
  },
  sectionLabelSheet: {
    fontSize: 11,
    letterSpacing: 1.76,
  },
  sectionFirst: { marginTop: 2 },
  /** Thin rule between workspace and settings (see `sectionDivider`). */
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    marginTop: 14,
    marginBottom: 12,
    alignSelf: 'stretch',
  },
  /** Label below divider — avoids stacking with `sectionFollowing` top gap. */
  sectionAfterDivider: { marginTop: 18 },
  /** Clear separation before a section when no divider is used. */
  sectionFollowing: { marginTop: ADMIN_NAV_SECTION_TOP_GAP },
  list: {},
  /** Touch target: ≥44pt tall (HIG), content vertically centered in `rowInner`. */
  rowHit: {
    borderRadius: 12,
    minHeight: ADMIN_NAV_MIN_TOUCH,
    justifyContent: 'center',
    paddingVertical: 0,
    paddingHorizontal: 12,
    alignSelf: 'stretch',
    width: '100%',
  },
  rowHitSheet: {
    paddingHorizontal: 0,
  },
  rowHitRail: {
    paddingHorizontal: 0,
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    flexWrap: 'nowrap',
  },
  navLabel: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  footerSheet: {
    paddingVertical: 14,
    paddingLeft: ADMIN_GUTTER + ADMIN_NAV_LABEL_INSET,
    paddingRight: ADMIN_GUTTER,
  },
  footerHint: { fontSize: 11, fontWeight: '500' },
});

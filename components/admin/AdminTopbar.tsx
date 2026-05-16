import React, { useMemo, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextStyle,
  useWindowDimensions,
  View,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { useAuth } from '@/components/auth/AuthProvider';
import { scaled } from '@/lib/fontScale';
import { hapticLight } from '@/lib/safeHaptics';
import { useColorScheme } from '@/components/useColorScheme';
import { adminSearchChrome } from '@/components/admin/clarityTokens';
import { ADMIN_GUTTER, ADMIN_ROW_HEIGHT } from '@/components/admin/layoutTokens';

/** Android adds extra font padding; without this, search label + chip text sit lower than icons. */
const androidNavText: TextStyle | undefined =
  Platform.OS === 'android'
    ? { includeFontPadding: false, textAlignVertical: 'center' as const }
    : undefined;

function useAdminLeafRoute(): { showBack: boolean } {
  const segments = useSegments();
  const adminIdx = segments.findIndex((s) => s === '(admin)');
  const leaf = adminIdx >= 0 ? segments[adminIdx + 1] : undefined;
  /** `index` omits a route segment; any named `(admin)/…` screen adds a leaf. */
  return { showBack: Boolean(leaf) };
}

/** Mirrors web topbar; search affordance + back when stacked under `(admin)`. */
export function AdminTopbar({
  onMenuPress,
  showMenuButton,
  menuOpen,
}: {
  onMenuPress: () => void;
  showMenuButton: boolean;
  menuOpen?: boolean;
}) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const { showBack } = useAdminLeafRoute();
  const { auth, signOut } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const narrow = width < 420;
  const tight = width < 375;
  const rowGap = tight ? 6 : 8;

  const email =
    auth.status === 'signed_in' && auth.user.email ? auth.user.email : 'admin@manilibrary.com';
  const initials = email.slice(0, 2).toUpperCase();

  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [dropdownAnchorY, setDropdownAnchorY] = useState<number | null>(null);
  const barRef = useRef<View>(null);

  const searchPlaceholder = useMemo(() => {
    if (width < 340) return 'Search…';
    if (narrow) return 'Search members…';
    return 'Search members, payments, seats…';
  }, [narrow, width]);

  const dropdownTopFallback = insets.top + 72;

  const openAccountMenu = () => {
    hapticLight();
    barRef.current?.measureInWindow((_x, y, _w, h) => {
      setDropdownAnchorY(y + h + 4);
      setAccountMenuOpen(true);
    });
  };

  const goBack = () => {
    hapticLight();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(admin)');
    }
  };

  const openSearch = () => {
    hapticLight();
    router.push('/(admin)/search');
  };

  const leadingSpacer = !showBack && !showMenuButton;

  return (
    <View
      ref={barRef}
      collapsable={false}
      style={[styles.bar, { borderBottomColor: c.border, backgroundColor: c.surface }]}
    >
      <View style={[styles.row, { gap: rowGap }]}>
        {showBack ? (
          <Pressable
            onPress={goBack}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={({ pressed }) => [styles.iconBtn, { borderColor: c.border }, pressed && { opacity: 0.75 }]}
          >
            <FontAwesome name="chevron-left" size={20} color={c.ink700} />
          </Pressable>
        ) : null}

        {showMenuButton ? (
          <Pressable
            onPress={onMenuPress}
            hitSlop={12}
            accessibilityLabel={menuOpen ? 'Close menu' : 'Open menu'}
            style={({ pressed }) => [styles.iconBtn, { borderColor: c.border }, pressed && { opacity: 0.75 }]}
          >
            <FontAwesome name={menuOpen ? 'times' : 'bars'} size={20} color={c.ink700} />
          </Pressable>
        ) : leadingSpacer ? (
          <View style={{ width: ADMIN_ROW_HEIGHT }} />
        ) : null}

        <Pressable
          accessibilityRole="search"
          accessibilityLabel={searchPlaceholder}
          onPress={openSearch}
          style={({ pressed }) => [
            styles.searchWrap,
            adminSearchChrome(c),
            {
              minHeight: ADMIN_ROW_HEIGHT,
              maxHeight: ADMIN_ROW_HEIGHT,
              opacity: pressed ? 0.92 : 1,
            },
          ]}
        >
          <FontAwesome name="search" size={14} color={c.ink400} style={styles.searchIcon} />
          <Text
            style={[
              styles.searchPlaceholderText,
              androidNavText,
              { color: c.ink400, fontSize: scaled(13) },
            ]}
            numberOfLines={1}
            maxFontSizeMultiplier={1.6}
          >
            {searchPlaceholder}
          </Text>
        </Pressable>

        <Pressable
          onPress={openAccountMenu}
          accessibilityLabel="Account menu"
          style={[
            styles.account,
            { borderColor: c.border, backgroundColor: c.surface },
            narrow && styles.accountCompact,
          ]}
        >
          <View style={[styles.avatar, { backgroundColor: c.azure500 }]}>
            <Text
              style={[styles.avatarText, androidNavText, { fontSize: scaled(11) }]}
              maxFontSizeMultiplier={1.5}
            >
              {initials}
            </Text>
          </View>
          {!narrow ? (
            <>
              <View style={styles.accountText}>
                <Text style={[styles.role, androidNavText, { color: c.ink900, fontSize: scaled(11) }]}>
                  Admin
                </Text>
                <Text
                  style={[styles.email, androidNavText, { color: c.ink500, fontSize: scaled(10) }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  selectable={false}
                  maxFontSizeMultiplier={1.6}
                >
                  {email}
                </Text>
              </View>
              <FontAwesome name="chevron-down" size={12} color={c.ink400} />
            </>
          ) : (
            <FontAwesome name="chevron-down" size={12} color={c.ink400} style={{ marginLeft: 2 }} />
          )}
        </Pressable>
      </View>

      <Modal
        transparent
        visible={accountMenuOpen}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          setAccountMenuOpen(false);
          setDropdownAnchorY(null);
        }}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => {
              setAccountMenuOpen(false);
              setDropdownAnchorY(null);
            }}
          />
          <View
            style={[
              styles.dropdown,
              {
                borderColor: c.border,
                backgroundColor: c.surface,
                right: Math.max(ADMIN_GUTTER, insets.right),
                top: dropdownAnchorY ?? dropdownTopFallback,
              },
            ]}
          >
            <View style={[styles.dropdownHead, { borderBottomColor: c.border }]}>
              <Text style={[styles.ddRole, androidNavText, { color: c.ink900 }]}>Admin</Text>
              <Text style={[styles.ddEmail, androidNavText, { color: c.ink500 }]} selectable>
                {email}
              </Text>
            </View>
            <Pressable
              onPress={() => {
                setAccountMenuOpen(false);
                setDropdownAnchorY(null);
                signOut();
              }}
              style={({ pressed }) => [styles.ddRow, pressed && { backgroundColor: c.ink50 }]}
            >
              <FontAwesome name="sign-out" size={14} color={c.ink500} />
              <Text style={[styles.ddSignOut, androidNavText, { color: c.ink700 }]}>Sign out</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderBottomWidth: 1,
    paddingHorizontal: ADMIN_GUTTER,
    paddingVertical: 10,
    zIndex: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: ADMIN_ROW_HEIGHT,
  },
  iconBtn: {
    width: ADMIN_ROW_HEIGHT,
    height: ADMIN_ROW_HEIGHT,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 10,
    minWidth: 0,
  },
  searchIcon: { marginRight: 6, flexShrink: 0 },
  searchPlaceholderText: {
    flex: 1,
    fontWeight: '500',
    minWidth: 0,
    paddingVertical: 2,
  },
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingLeft: 4,
    paddingRight: 10,
    paddingVertical: 4,
    flexShrink: 0,
    maxWidth: 200,
  },
  accountCompact: {
    maxWidth: 72,
    paddingRight: 8,
    gap: 4,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontFamily: 'SpaceMono' },
  accountText: { flex: 1, minWidth: 0 },
  role: { fontWeight: '700' },
  email: { fontFamily: 'SpaceMono', flexShrink: 1 },
  modalRoot: { flex: 1 },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(16,24,40,0.25)',
  },
  dropdown: {
    position: 'absolute',
    width: 260,
    maxWidth: '92%',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#101828',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  dropdownHead: { padding: 12, borderBottomWidth: 1 },
  ddRole: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  ddEmail: { marginTop: 6, fontSize: 11, fontFamily: 'SpaceMono', lineHeight: 16 },
  ddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: ADMIN_GUTTER,
    paddingVertical: 12,
  },
  ddSignOut: { fontSize: 14, fontWeight: '600' },
});

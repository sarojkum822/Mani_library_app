import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { headerElevation } from '@/lib/platformStyles';
import { hapticLight } from '@/lib/safeHaptics';
import { useColorScheme } from '@/components/useColorScheme';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminTopbar } from '@/components/admin/AdminTopbar';

const LG_MIN_WIDTH = 1024;

/**
 * Same structure as `manilibrary/src/components/dashboard/DashboardShell.tsx`:
 * sidebar + column(top bar + main).
 *
 * On narrow widths, the hamburger opens a **left drawer** under the top bar (iOS-style).
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const { width } = useWindowDimensions();
  const isWide = width >= LG_MIN_WIDTH;

  const drawerWidth = Math.min(300, Math.round(width * 0.86));
  /** Closed drawer sits off-screen to the left. */
  const closedX = -(drawerWidth + 8);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [topbarHeight, setTopbarHeight] = useState(56);

  const slide = useRef(new Animated.Value(closedX)).current;

  const openSidebar = useCallback(() => setSidebarOpen(true), []);

  const closeSidebar = useCallback(() => {
    if (isWide) {
      setSidebarOpen(false);
      return;
    }
    Animated.timing(slide, {
      toValue: closedX,
      duration: 240,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setSidebarOpen(false);
    });
  }, [isWide, slide, closedX]);

  const toggleSidebar = useCallback(() => {
    hapticLight();
    if (sidebarOpen) closeSidebar();
    else openSidebar();
  }, [sidebarOpen, closeSidebar, openSidebar]);

  useEffect(() => {
    if (isWide) setSidebarOpen(false);
  }, [isWide]);

  useEffect(() => {
    if (!sidebarOpen || isWide) return;
    slide.setValue(closedX);
    Animated.timing(slide, {
      toValue: 0,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [sidebarOpen, isWide, slide, closedX]);

  /** Keep off-screen distance in sync when rotating / split-screen (avoid stuck sheet). */
  useEffect(() => {
    if (sidebarOpen || isWide) return;
    slide.setValue(closedX);
  }, [closedX, isWide, sidebarOpen, slide]);

  return (
    <View style={[styles.root, { backgroundColor: c.surfaceMuted }]}>
      {isWide ? <AdminSidebar /> : null}

      {/* Left/right safe areas so top bar & sheet share the same horizontal inset as notched devices. */}
      <SafeAreaView
        style={[styles.mainColumn, { backgroundColor: c.surfaceMuted }]}
        edges={['top', 'left', 'right']}
      >
        <View style={[styles.column, Platform.OS === 'android' && styles.columnAndroid]}>
          <View
            style={[
              styles.topbarWrap,
              { backgroundColor: c.surface },
              headerElevation(),
            ]}
            onLayout={(e) => setTopbarHeight(e.nativeEvent.layout.height)}
          >
            <AdminTopbar
              showMenuButton={!isWide}
              menuOpen={!isWide && sidebarOpen}
              onMenuPress={toggleSidebar}
            />
          </View>

          <View style={[styles.main, { backgroundColor: c.surfaceMuted }]}>{children}</View>

          {/* Opaque layer above page content while menu animates — stops page bleeding through under the sheet transform. */}
          {!isWide && sidebarOpen ? (
            <View
              pointerEvents="none"
              style={[
                styles.menuUnderlay,
                {
                  top: topbarHeight,
                  backgroundColor: c.surfaceMuted,
                },
              ]}
            />
          ) : null}

          {!isWide && sidebarOpen ? (
            <>
              <Pressable
                style={[
                  styles.menuBackdrop,
                  {
                    top: topbarHeight,
                    backgroundColor: 'rgba(16,24,40,0.38)',
                  },
                ]}
                onPress={closeSidebar}
              />
              {/*
                Clip everything strictly below the top bar. Without this, transform layers can
                briefly paint “Mani Library” / menu pixels into the status bar or over the search row.
              */}
              <View
                collapsable={false}
                style={[
                  styles.drawerClip,
                  {
                    top: topbarHeight,
                    width: drawerWidth,
                    backgroundColor: c.surface,
                    borderRightColor: c.border,
                  },
                ]}
              >
                <Animated.View style={[styles.drawerInner, { transform: [{ translateX: slide }] }]}>
                  <AdminSidebar variant="sheet" onNavigate={closeSidebar} />
                </Animated.View>
              </View>
            </>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    minHeight: '100%',
    minWidth: 0,
  },
  mainColumn: {
    flex: 1,
    minWidth: 0,
    minHeight: '100%',
  },
  column: {
    flex: 1,
    position: 'relative',
    minWidth: 0,
  },
  /** Avoid clipping Material elevation on the top bar (Android). */
  columnAndroid: {
    overflow: 'visible',
  },
  topbarWrap: {
    zIndex: 102,
  },
  menuUnderlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
  },
  menuBackdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  drawerClip: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    zIndex: 101,
    overflow: 'hidden',
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  drawerInner: {
    flex: 1,
    width: '100%',
  },
  main: {
    flex: 1,
    minWidth: 0,
    zIndex: 1,
  },
});

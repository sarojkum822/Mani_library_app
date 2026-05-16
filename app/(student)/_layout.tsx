import React, { useEffect } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { StyleSheet } from 'react-native';

import { useAuth } from '@/components/auth/AuthProvider';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { tabBarElevation } from '@/lib/platformStyles';
import { openStudentProfileHub } from '@/lib/openStudentProfileHub';

function TabBarIcon(props: { name: React.ComponentProps<typeof FontAwesome>['name']; color: string }) {
  return <FontAwesome size={22} style={{ marginBottom: -2 }} {...props} />;
}

export default function StudentTabsLayout() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const { auth } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  const signedIn = auth.status === 'signed_in';
  /** Guest mode: brand (home) only — no member tabs or bottom bar until sign-in. */
  const guestMode = !signedIn;
  const showMemberTabs = signedIn;

  useEffect(() => {
    if (signedIn) return;
    const segs = segments as unknown as string[];
    const tail = segs[segs.length - 1];
    const onMemberArea =
      segs.includes('membership') || segs.includes('profile') || segs.includes('attendance') || tail === 'doc';
    if (onMemberArea) {
      router.replace('/(student)');
    }
  }, [signedIn, segments, router]);

  const tabBarShown = {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    backgroundColor: c.surface,
    paddingTop: 4,
    ...tabBarElevation(),
  };

  /** Tab order (left → right): Home, Membership, Attendance, Profile — Attendance is penultimate, Profile last. */
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.tint,
        tabBarInactiveTintColor: c.tabIconDefault,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.15,
        },
        tabBarIconStyle: { marginBottom: -2 },
        tabBarStyle: guestMode ? { display: 'none', height: 0 } : tabBarShown,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="membership"
        options={{
          title: 'Membership',
          href: showMemberTabs ? undefined : null,
          tabBarIcon: ({ color }) => <TabBarIcon name="credit-card" color={color} />,
        }}
      />
      {/* Route file is `attendance/index.tsx` → screen name must be `attendance/index` or the tab is omitted from this list and sorted last (wrong order + truncated label). */}
      <Tabs.Screen
        name="attendance/index"
        options={{
          title: 'Attendance',
          href: showMemberTabs ? undefined : null,
          tabBarIcon: ({ color }) => <TabBarIcon name="calendar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        listeners={{
          tabPress: (e) => {
            const segs = segments as unknown as string[];
            if (!segs.includes('profile')) return;
            const onNestedProfile =
              segs.includes('details') ||
              segs.includes('doc') ||
              segs.includes('transactions') ||
              segs.includes('membership');
            if (onNestedProfile) {
              e.preventDefault();
              openStudentProfileHub();
            }
          },
        }}
        options={{
          title: 'Profile',
          href: showMemberTabs ? undefined : null,
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
        }}
      />
    </Tabs>
  );
}


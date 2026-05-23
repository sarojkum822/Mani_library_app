import type { ComponentProps } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export type AdminNavKey =
  | 'overview'
  | 'members'
  | 'feedback'
  | 'gallery'
  | 'payments'
  | 'attendance'
  | 'subscriptions'
  | 'documents'
  | 'settings';

export type AdminNavItem = {
  key: AdminNavKey;
  href: string;
  label: string;
  icon: ComponentProps<typeof FontAwesome>['name'];
  section: 'workspace' | 'settings';
};

/** Mirrors `manilibrary/src/components/dashboard/Sidebar.tsx` primary + secondary links. */
export const ADMIN_NAV: AdminNavItem[] = [
  { key: 'overview', href: '/(admin)', label: 'Overview', icon: 'th-large', section: 'workspace' },
  { key: 'members', href: '/(admin)/members', label: 'Members', icon: 'users', section: 'workspace' },
  { key: 'feedback', href: '/(admin)/feedback', label: 'Feedback', icon: 'comment', section: 'workspace' },
  { key: 'gallery', href: '/(admin)/gallery', label: 'Gallery', icon: 'picture-o', section: 'workspace' },
  { key: 'payments', href: '/(admin)/payments', label: 'Payments', icon: 'credit-card', section: 'workspace' },
  { key: 'attendance', href: '/(admin)/attendance', label: 'Attendance', icon: 'calendar-check-o', section: 'workspace' },
  {
    key: 'subscriptions',
    href: '/(admin)/subscriptions',
    label: 'Subscriptions',
    icon: 'refresh',
    section: 'workspace',
  },
  { key: 'documents', href: '/(admin)/docs', label: 'Documents', icon: 'file-text-o', section: 'workspace' },
  { key: 'settings', href: '/(admin)/settings', label: 'Settings', icon: 'cog', section: 'settings' },
];

/** Primary destinations on phone bottom bar (rest via menu). */
export const ADMIN_BOTTOM_NAV: Pick<AdminNavItem, 'key' | 'href' | 'label' | 'icon'>[] = [
  { key: 'overview', href: '/(admin)', label: 'Home', icon: 'th-large' },
  { key: 'members', href: '/(admin)/members', label: 'Members', icon: 'users' },
  { key: 'attendance', href: '/(admin)/attendance', label: 'Attendance', icon: 'calendar-check-o' },
  { key: 'payments', href: '/(admin)/payments', label: 'Payments', icon: 'credit-card' },
];

export const ADMIN_BOTTOM_NAV_HEIGHT = 52;

import type { ComponentProps } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export type AdminNavKey =
  | 'overview'
  | 'members'
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

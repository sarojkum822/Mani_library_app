import React from 'react';
import { Redirect, Stack } from 'expo-router';

import { AdminShell } from '@/components/admin/AdminShell';
import { useAuth } from '@/components/auth/AuthProvider';

export default function AdminLayout() {
  const { auth } = useAuth();

  if (auth.status === 'loading') {
    return null;
  }

  if (auth.status === 'signed_out') {
    return <Redirect href="/(student)" />;
  }

  if (auth.user.role !== 'admin') {
    return <Redirect href="/(student)" />;
  }

  return (
    <AdminShell>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
    </AdminShell>
  );
}

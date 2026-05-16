import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdminKeyValueGroup } from '@/components/admin/AdminKeyValueGroup';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminSectionCard } from '@/components/admin/AdminSectionCard';
import { adminScrollContentInsets } from '@/components/admin/layoutTokens';
import { useAuth } from '@/components/auth/AuthProvider';
import { displayPersonName } from '@/lib/formatPersonName';
import { useLibraryInfo } from '@/components/library/LibraryInfoProvider';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Button } from '@/components/ui/Button';

export default function AdminSettings() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();
  const lib = useLibraryInfo();
  const { auth, signOut } = useAuth();

  const user = auth.status === 'signed_in' ? auth.user : null;
  const social = lib.social as { whatsapp?: string; instagram?: string; facebook?: string };

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: c.surfaceMuted }]}
      contentContainerStyle={adminScrollContentInsets(insets.bottom)}
      showsVerticalScrollIndicator={false}
    >
      <AdminPageHeader
        eyebrow="settings"
        title="Settings"
        description="Library profile (read-only) and your staff session."
      />

      <View style={styles.groupGap}>
      <AdminKeyValueGroup
        title="Library"
        rows={[
          { label: 'Name', value: lib.name },
          { label: 'Established', value: String(lib.established) },
          { label: 'Capacity', value: `${lib.capacity} seats` },
          { label: 'Hours', value: lib.hours },
        ]}
      />

      <AdminKeyValueGroup
        title="Owner"
        rows={[
          { label: 'Name', value: lib.owner.name },
          { label: 'Role', value: lib.owner.role },
          { label: 'Phone', value: lib.owner.phone },
          { label: 'Email', value: lib.owner.email },
        ]}
      />

      <AdminKeyValueGroup
        title="Address"
        rows={[
          { label: 'Line 1', value: lib.address.line1 },
          ...('line2' in lib.address && lib.address.line2
            ? [{ label: 'Line 2', value: String(lib.address.line2) }]
            : []),
          { label: 'City', value: lib.address.city },
          { label: 'State', value: lib.address.state },
          { label: 'Pincode', value: lib.address.pincode },
        ]}
      />

      <AdminKeyValueGroup
        title="Contact"
        rows={[
          { label: 'Primary phone', value: lib.contact.primaryPhone },
          { label: 'Support email', value: lib.contact.supportEmail },
          { label: 'Website', value: lib.contact.website },
          ...(social?.whatsapp
            ? [
                {
                  label: 'WhatsApp',
                  value: (
                    <Pressable onPress={() => Linking.openURL(social.whatsapp!)}>
                      <Text style={{ color: c.azure600, fontWeight: '600' }}>{social.whatsapp}</Text>
                    </Pressable>
                  ),
                },
              ]
            : []),
        ]}
      />

      {lib.developers && lib.developers.length > 0 ? (
        <AdminSectionCard title="Team">
          {lib.developers.map((d) => (
            <View key={d.name} style={[styles.devRow, { borderBottomColor: c.border }]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.devName, { color: c.ink900 }]}>{d.name}</Text>
                <Text style={[styles.devRole, { color: c.ink500 }]}>{d.role}</Text>
              </View>
              <Pressable onPress={() => Linking.openURL(d.url)}>
                <Text style={[styles.devLink, { color: c.azure500 }]}>{d.label}</Text>
              </Pressable>
            </View>
          ))}
        </AdminSectionCard>
      ) : null}

      <AdminKeyValueGroup
        title="Admin session"
        rows={[
          { label: 'Signed in as', value: user?.name ? displayPersonName(user.name, '—') : '—' },
          ...(user?.email ? [{ label: 'Email', value: user.email }] : []),
        ]}
      />
      <View style={{ marginTop: 8 }}>
        <Button title="Sign out" variant="secondary" onPress={signOut} />
      </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  groupGap: { gap: 16 },
  devRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  devName: { fontSize: 15, fontWeight: '600' },
  devRole: { marginTop: 2, fontSize: 13, fontWeight: '400' },
  devLink: { fontSize: 14, fontWeight: '600' },
});

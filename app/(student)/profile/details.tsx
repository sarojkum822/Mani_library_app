import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CopyIdButton } from '@/components/admin/CopyIdButton';
import { clarityPageTitle } from '@/components/admin/clarityTokens';
import { StudentSectionLabel } from '@/components/student/StudentSectionLabel';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/components/auth/AuthProvider';
import { useMemberPrefetch } from '@/components/member/MemberPrefetchProvider';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { deviceUserIdDisplayFromProfile } from '@/lib/api';
import { formatDisplayName } from '@/lib/displayName';
import {
  InfoRow,
  institutionLabel,
  resolveMemberContact,
  verificationLabelForProfile,
  verificationToneForProfile,
} from '@/components/student/profileShared';

function ProfileFieldsCard({ children }: { children: React.ReactNode }) {
  return <Card style={{ padding: 0, overflow: 'hidden', marginTop: 6 }}>{children}</Card>;
}

export default function ProfileDetailsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();
  const { auth } = useAuth();
  const user = auth.status === 'signed_in' ? auth.user : null;

  const { profile: memberProfile, profileError, profileLoading, refetch } = useMemberPrefetch();
  const loading = profileLoading && !memberProfile;
  const error = profileError;

  const displayName = formatDisplayName(memberProfile?.name ?? user?.name) || (memberProfile?.name ?? user?.name ?? '—');
  const deviceId = deviceUserIdDisplayFromProfile(memberProfile);
  const verificationStatus = memberProfile?.verificationStatus ?? 'none';
  const kycSlots = memberProfile?.memberKycSlots
    ? Object.values(memberProfile.memberKycSlots)
    : null;
  const contact = resolveMemberContact(memberProfile, user);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.surfaceMuted }}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: Math.max(insets.bottom, 20) + 24,
      }}
      keyboardShouldPersistTaps="handled"
    >
      {error ? (
        <Card style={{ padding: 16, marginTop: 14, borderColor: c.border }}>
          <Text style={{ color: c.ink900, fontWeight: '600' }}>Could not load</Text>
          <Text style={{ marginTop: 6, color: c.ink600, fontSize: 13, lineHeight: 19 }}>{error}</Text>
          <Button title="Try again" onPress={() => void refetch()} style={{ marginTop: 12 }} />
        </Card>
      ) : null}

      {loading && !memberProfile ? (
        <View style={{ paddingVertical: 48, alignItems: 'center' }}>
          <ActivityIndicator color={c.azure500} />
        </View>
      ) : (
        <>
          <Card style={{ padding: 16, marginTop: 14, gap: 12 }}>
            <Text style={[clarityPageTitle(24), { color: c.ink900 }]} numberOfLines={2}>
              {displayName}
            </Text>
            <View style={[styles.memberIdPill, { backgroundColor: c.azure50, borderColor: c.azure100 }]}>
              <Text style={[styles.memberIdLabel, { color: c.ink600 }]}>Member ID</Text>
              <CopyIdButton value={deviceId === '—' ? '' : deviceId} label="Copy" preview={deviceId} />
            </View>
            <View style={[styles.verifyInline, { borderTopColor: c.ink100 }]}>
              <Text style={[styles.verifyLabel, { color: c.ink600 }]}>ID verification</Text>
              <StatusBadge
                tone={verificationToneForProfile(verificationStatus, kycSlots)}
                label={verificationLabelForProfile(verificationStatus, kycSlots)}
              />
            </View>
          </Card>

          <StudentSectionLabel title="Contact" />
          <ProfileFieldsCard>
            <InfoRow layout="inline" label="Phone" value={contact.phone} />
            <InfoRow layout="inline" label="Email" value={contact.email} last />
          </ProfileFieldsCard>

          <StudentSectionLabel title="Identity" />
          <ProfileFieldsCard>
            <InfoRow layout="inline" label="Aadhaar (last 4)" value={memberProfile?.aadhaarLastFour?.trim() || '—'} mono last />
          </ProfileFieldsCard>

          <StudentSectionLabel title="Study" />
          <ProfileFieldsCard>
            <InfoRow layout="inline" label="Roll / reg. no." value={memberProfile?.studentRollNumber?.trim() || '—'} />
            <InfoRow layout="inline" label="Institution" value={institutionLabel(memberProfile?.institutionType)} />
            <InfoRow layout="inline" label="Preparing for" value={memberProfile?.preparingFor?.trim() || '—'} last />
          </ProfileFieldsCard>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  memberIdPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  memberIdLabel: { fontSize: 14, fontWeight: '500' },
  verifyInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  verifyLabel: { fontSize: 15, fontWeight: '400' },
});

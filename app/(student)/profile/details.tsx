import React, { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StudentSectionLabel } from '@/components/student/StudentSectionLabel';
import { MemberIdCard } from '@/components/student/MemberIdCard';
import { DetailRow } from '@/components/student/DetailRow';
import { EditableDetailsCard } from '@/components/student/EditableDetailsCard';
import {
  ProfileIntakeEditModal,
  type ProfileIntakeEditSection,
} from '@/components/student/ProfileIntakeEditModal';
import Colors from '@/constants/Colors';
import { type } from '@/constants/Typography';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/components/auth/AuthProvider';
import { useMemberPrefetch } from '@/components/member/MemberPrefetchProvider';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { deviceUserIdDisplayFromProfile } from '@/lib/api';
import { formatDisplayName } from '@/lib/displayName';
import { MEMBERSHIP_INSTITUTION_VALUES } from '@/lib/membershipInstitutionOptions';
import { sanitizeAadhaarLastFourInput, sanitizeRollNumberDigitsInput } from '@/lib/intakeFieldLimits';
import {
  institutionLabel,
  resolveMemberContact,
  verificationLabelForProfile,
  verificationToneForProfile,
} from '@/components/student/profileShared';

export default function ProfileDetailsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();
  const { auth } = useAuth();
  const user = auth.status === 'signed_in' ? auth.user : null;
  const token = auth.status === 'signed_in' ? auth.token : null;

  const { profile: memberProfile, profileError, profileLoading, refetch } = useMemberPrefetch();
  const loading = profileLoading && !memberProfile;
  const error = profileError;

  const [editSection, setEditSection] = useState<ProfileIntakeEditSection | null>(null);

  const displayName = formatDisplayName(memberProfile?.name ?? user?.name) || (memberProfile?.name ?? user?.name ?? '—');
  const deviceId = deviceUserIdDisplayFromProfile(memberProfile);
  const verificationStatus = memberProfile?.verificationStatus ?? 'none';
  const kycSlots = memberProfile?.memberKycSlots
    ? Object.values(memberProfile.memberKycSlots)
    : null;
  const contact = resolveMemberContact(memberProfile, user);

  const intakeInitial = useMemo(() => {
    const inst = (memberProfile?.institutionType ?? '').trim();
    return {
      aadhaarLastFour: sanitizeAadhaarLastFourInput(memberProfile?.aadhaarLastFour ?? ''),
      studentRollNumber: sanitizeRollNumberDigitsInput(String(memberProfile?.studentRollNumber ?? '')),
      institutionType: MEMBERSHIP_INSTITUTION_VALUES.has(inst) ? inst : '',
      preparingFor: memberProfile?.preparingFor?.trim() ?? '',
    };
  }, [memberProfile]);

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
          <Card style={{ ...styles.heroCard, backgroundColor: c.surface }}>
            <Text style={[type.headline, { color: c.ink900 }]} numberOfLines={2}>
              {displayName}
            </Text>
            <MemberIdCard deviceId={deviceId === '—' ? '' : deviceId} loading={loading} />
            <View style={[styles.verifyRow, { borderTopColor: c.ink100 }]}>
              <Text style={[styles.verifyLabel, { color: c.ink600 }]}>ID verification</Text>
              <StatusBadge
                tone={verificationToneForProfile(verificationStatus, kycSlots)}
                label={verificationLabelForProfile(verificationStatus, kycSlots)}
              />
            </View>
          </Card>

          <StudentSectionLabel title="Contact" />
          <Card style={{ padding: 0, overflow: 'hidden', marginTop: 6 }}>
            {contact.phone !== '—' ? <DetailRow label="Phone" value={contact.phone} /> : null}
            <DetailRow label="Email" value={contact.email} last={contact.phone === '—'} />
          </Card>

          <StudentSectionLabel title="Identity" />
          <EditableDetailsCard
            title="Identity"
            onEdit={() => setEditSection('identity')}
            onDocuments={() => router.push('/(student)/profile/doc')}
          >
            <DetailRow
              label="Aadhaar (last 4)"
              value={memberProfile?.aadhaarLastFour?.trim() || '—'}
              mono
              last
            />
          </EditableDetailsCard>

          <StudentSectionLabel title="Study" />
          <EditableDetailsCard title="Study" onEdit={() => setEditSection('study')}>
            <DetailRow label="Roll / reg. no." value={memberProfile?.studentRollNumber?.trim() || '—'} />
            <DetailRow label="Institution" value={institutionLabel(memberProfile?.institutionType)} />
            <DetailRow label="Preparing for" value={memberProfile?.preparingFor?.trim() || '—'} last />
          </EditableDetailsCard>
        </>
      )}

      {token && editSection ? (
        <ProfileIntakeEditModal
          visible
          section={editSection}
          initial={intakeInitial}
          token={token}
          onClose={() => setEditSection(null)}
          onSaved={() => void refetch()}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    padding: 16,
    marginTop: 14,
    gap: 0,
  },
  verifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  verifyLabel: { ...type.body, fontWeight: '500' },
});

import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CopyIdButton } from '@/components/admin/CopyIdButton';
import { CLARITY_BODY, CLARITY_HINT } from '@/components/admin/clarityTokens';
import { StudentPageHeader } from '@/components/student/StudentPageHeader';
import { useLibraryInfo } from '@/components/library/LibraryInfoProvider';
import { StudentSectionLabel } from '@/components/student/StudentSectionLabel';
import {
  verificationLabelForProfile,
  verificationToneForProfile,
} from '@/components/student/profileShared';
import Colors from '@/constants/Colors';
import { type } from '@/constants/Typography';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/components/auth/AuthProvider';
import { useMemberPrefetch } from '@/components/member/MemberPrefetchProvider';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SettingsRow } from '@/components/ui/SettingsRow';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { api, deviceUserIdDisplayFromProfile } from '@/lib/api';
import { formatDeviceUserIdPadded } from '@/lib/deviceUserIdLabel';
import { formatDisplayName, initialsFromPersonName } from '@/lib/displayName';
import { clearProfilePhoto } from '@/lib/profilePhotoStorage';
import { hapticLight } from '@/lib/safeHaptics';
import { forgotPasswordUrl } from '@/lib/siteUrls';

function mimeFromPicker(mime: string | undefined, uri: string): string {
  if (mime && mime.startsWith('image/')) return mime;
  const u = uri.toLowerCase();
  if (u.endsWith('.png')) return 'image/png';
  if (u.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

export default function StudentProfileScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();
  const { auth, signOut } = useAuth();

  const user = auth.status === 'signed_in' ? auth.user : null;
  const token = auth.status === 'signed_in' ? auth.token : null;

  const lib = useLibraryInfo();
  const {
    profile: memberProfile,
    profileError,
    profileLoading,
    membership,
    refetch,
  } = useMemberPrefetch();

  const [photoLoading, setPhotoLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const deviceIdFromProfile = deviceUserIdDisplayFromProfile(memberProfile);
  const deviceIdFromUser =
    user?.deviceUserId != null ? formatDeviceUserIdPadded(user.deviceUserId) : '';
  const deviceId =
    deviceIdFromProfile !== '—'
      ? deviceIdFromProfile
      : membership?.deviceUserId?.trim() || deviceIdFromUser || '—';
  const profileMetaLoading = profileLoading && !memberProfile && deviceId === '—';
  const verificationMetaLoading = profileLoading && !memberProfile;
  const verificationStatus = memberProfile?.verificationStatus ?? 'none';
  const kycSlots = memberProfile?.memberKycSlots
    ? Object.values(memberProfile.memberKycSlots)
    : null;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const openSupport = useCallback(() => {
    const email = lib.contact.supportEmail?.trim();
    if (!email) return;
    void (async () => {
      try {
        await Linking.openURL(`mailto:${email}`);
      } catch {
        Alert.alert('Support email', email);
      }
    })();
  }, [lib.contact.supportEmail]);

  const openForgotPassword = useCallback(() => {
    void Linking.openURL(forgotPasswordUrl());
  }, []);

  const rawName = memberProfile?.name ?? user?.name ?? '';
  const displayName = formatDisplayName(rawName) || rawName.trim() || 'Member';
  const remoteAvatar = memberProfile?.avatarUrl ? memberProfile.avatarUrl : null;
  const displayAvatarUri = remoteAvatar;
  const avatarSize = 96;
  const initials = user ? initialsFromPersonName(rawName || user.name, user.email, user.phone) : '';

  const openPhotoOptions = useCallback(() => {
    if (!user || !token) return;
    hapticLight();
    Alert.alert('Profile photo', 'Choose how to update your picture', [
      {
        text: 'Photo library',
        onPress: () => pickFromLibrary(),
      },
      {
        text: 'Camera',
        onPress: () => pickFromCamera(),
      },
      ...(displayAvatarUri
        ? [
            {
              text: 'Remove photo',
              style: 'destructive' as const,
              onPress: async () => {
                try {
                  setPhotoLoading(true);
                  await api.removeAvatar(token);
                  await clearProfilePhoto(user.id);
                  await refetch();
                } catch (e: unknown) {
                  Alert.alert('Could not remove photo', e instanceof Error ? e.message : 'Try again.');
                } finally {
                  setPhotoLoading(false);
                }
              },
            },
          ]
        : []),
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [user, token, displayAvatarUri, refetch]);

  const pickFromLibrary = async () => {
    if (!user || !token) return;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Allow photo access to set your profile picture.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (res.canceled || !res.assets[0]?.uri) return;
      const asset = res.assets[0];
      setPhotoLoading(true);
      const mime = mimeFromPicker(asset.mimeType ?? undefined, asset.uri);
      await api.uploadAvatar(token, { uri: asset.uri, mimeType: mime, name: 'photo.jpg' });
      await refetch();
    } catch (e: unknown) {
      Alert.alert('Could not save photo', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setPhotoLoading(false);
    }
  };

  const pickFromCamera = async () => {
    if (!user || !token) return;
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Allow camera access to take a profile picture.');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (res.canceled || !res.assets[0]?.uri) return;
      const asset = res.assets[0];
      setPhotoLoading(true);
      const mime = mimeFromPicker(asset.mimeType ?? undefined, asset.uri);
      await api.uploadAvatar(token, { uri: asset.uri, mimeType: mime, name: 'photo.jpg' });
      await refetch();
    } catch (e: unknown) {
      Alert.alert('Could not save photo', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setPhotoLoading(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: c.surfaceMuted }]}>
      <StudentPageHeader
        title={user ? 'Profile' : 'Account'}
        subtitle={
          user ? undefined : 'Sign in for membership, attendance, and your library account.'
        }
      />

      {!user ? (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 20,
            paddingBottom: Math.max(insets.bottom, 12) + 24,
            gap: 12,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Card style={{ paddingHorizontal: 18, paddingVertical: 18, gap: 14 }}>
            <Text style={{ color: c.ink900, fontSize: 12, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' }}>
              Explore first, sign in when you need to
            </Text>
            <Text style={{ color: c.ink600, fontSize: 14, lineHeight: 22, fontWeight: '500' }}>
              Use Home to learn about the library. When you join, sign in here—your profile syncs with the website.
            </Text>
            <Button title="Sign in" onPress={() => router.push('/(auth)/login')} />
          </Card>

          <View style={{ alignItems: 'center', paddingTop: 28, paddingHorizontal: 8 }}>
            <FontAwesome name="user-circle-o" size={40} color={c.ink300} />
            <Text style={{ marginTop: 14, color: c.ink800, fontSize: 16, fontWeight: '600', textAlign: 'center' }}>
              Membership after you sign in
            </Text>
            <Text style={{ marginTop: 8, color: c.ink500, fontSize: 13, fontWeight: '500', textAlign: 'center', lineHeight: 19 }}>
              After sign-in you get Home, Membership, Attendance, and Profile on the tab bar — guests browse the brand page only.
            </Text>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 12) + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              tintColor={c.azure500}
            />
          }
        >
          {profileError ? (
            <View style={[styles.inlineErr, { backgroundColor: c.red100, borderColor: c.border }]}>
              <Text style={[CLARITY_BODY, { color: c.ink900 }]}>Could not refresh profile</Text>
              <Text style={[CLARITY_HINT, { color: c.ink600, marginTop: 4 }]}>{profileError}</Text>
              <Pressable onPress={() => void refetch()} style={{ marginTop: 8 }}>
                <Text style={{ color: c.azure600, fontSize: 14, fontWeight: '600' }}>Try again</Text>
              </Pressable>
            </View>
          ) : null}

          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <View style={[styles.hero, { backgroundColor: c.surface }]}>
              <>
              <View style={[styles.avatarStage, { width: avatarSize + 48, minHeight: avatarSize + 36 }]}>
                <View
                  style={[
                    styles.avatarRing,
                    {
                      width: avatarSize + 8,
                      height: avatarSize + 8,
                      borderColor: c.border,
                      backgroundColor: c.surfaceMuted,
                      overflow: 'hidden',
                    },
                  ]}
                >
                  {displayAvatarUri ? (
                    <Image source={{ uri: displayAvatarUri }} style={[styles.avatarImg, { width: avatarSize, height: avatarSize }]} />
                  ) : (
                    <View
                      style={[
                        styles.avatarPlaceholder,
                        { width: avatarSize, height: avatarSize, backgroundColor: c.azure500 },
                      ]}
                    >
                      <Text style={[styles.avatarInitials, { fontSize: avatarSize * 0.32 }]}>{initials}</Text>
                    </View>
                  )}
                  {photoLoading ? (
                    <View style={[styles.avatarBusyOverlay, { backgroundColor: `${c.surface}CC` }]}>
                      <ActivityIndicator color={c.azure500} />
                    </View>
                  ) : null}
                </View>

                <Pressable
                  onPress={openPhotoOptions}
                  disabled={photoLoading}
                  hitSlop={10}
                  style={({ pressed }) => [
                    styles.cameraFab,
                    {
                      backgroundColor: c.azure500,
                      borderColor: c.surface,
                      opacity: photoLoading ? 0.45 : pressed ? 0.9 : 1,
                    },
                  ]}
                  accessibilityLabel="Change profile photo"
                  accessibilityRole="button"
                >
                  <FontAwesome name="camera" size={14} color="#fff" />
                </Pressable>
              </View>

                  <Text style={[type.headline, styles.displayName, { color: c.ink900 }]}>{displayName}</Text>
                  <View style={[styles.metaRow, { borderTopColor: c.border }]}>
                    <View style={styles.metaBlock}>
                      <Text style={[CLARITY_HINT, { color: c.ink500 }]}>Member ID</Text>
                      {profileMetaLoading ? (
                        <ActivityIndicator color={c.azure500} style={{ marginTop: 6, alignSelf: 'flex-start' }} />
                      ) : (
                        <CopyIdButton value={deviceId === '—' ? '' : deviceId} label="Copy ID" />
                      )}
                    </View>
                    <View style={styles.metaBlock}>
                      <Text style={[CLARITY_HINT, { color: c.ink500 }]}>ID verification</Text>
                      {verificationMetaLoading ? (
                        <ActivityIndicator color={c.azure500} style={{ marginTop: 6, alignSelf: 'flex-start' }} />
                      ) : (
                        <StatusBadge
                          tone={verificationToneForProfile(verificationStatus, kycSlots)}
                          label={verificationLabelForProfile(verificationStatus, kycSlots)}
                        />
                      )}
                    </View>
                  </View>
                </>
            </View>
          </Card>

          <StudentSectionLabel title="Account" />
          <Card style={{ padding: 0, overflow: 'hidden', marginTop: 6 }}>
            <SettingsRow
              iconIon="person-outline"
              title="Your profile"
              subtitle="Device user id, contact, verification, intake"
              onPress={() => router.push('/(student)/profile/details')}
              showSeparator
            />
            <SettingsRow
              iconIon="card-outline"
              title="Membership"
              subtitle="Plan, seat, and dates"
              onPress={() => router.push('/(student)/profile/membership')}
              showSeparator
            />
            <SettingsRow
              iconIon="wallet-outline"
              title="Payments"
              subtitle="Receipts, renewals, and status"
              onPress={() => router.push('/(student)/profile/transactions')}
              showSeparator={false}
            />
          </Card>

          <StudentSectionLabel title="General" />
          <Card style={{ padding: 0, overflow: 'hidden', marginTop: 6 }}>
            <SettingsRow
              iconIon="document-text-outline"
              title="Documents & verification"
              subtitle="Aadhaar and student ID"
              onPress={() => router.push('/(student)/profile/doc')}
              showSeparator
            />
            <SettingsRow
              iconIon="refresh-outline"
              title="Recover payment"
              subtitle="Razorpay paid but membership missing"
              onPress={() => router.push('/(student)/profile/recover-payment')}
              showSeparator
            />
            <SettingsRow
              iconIon="mail-outline"
              title="Help & support"
              subtitle={lib.contact.supportEmail}
              onPress={openSupport}
              showSeparator
            />
            <SettingsRow
              iconIon="key-outline"
              title="Forgot password"
              subtitle="Reset via website"
              onPress={openForgotPassword}
              showSeparator={false}
            />
          </Card>

          <Card style={{ padding: 0, overflow: 'hidden', marginTop: 24, marginBottom: 28 }}>
            <SettingsRow iconIon="log-out-outline" title="Sign out" destructive onPress={() => signOut()} showSeparator={false} />
          </Card>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inlineErr: {
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  hero: { paddingTop: 24, paddingBottom: 16, paddingHorizontal: 20, alignItems: 'stretch' },
  avatarStage: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  avatarRing: {
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBusyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  avatarImg: { borderRadius: 999 },
  avatarPlaceholder: { borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { color: '#fff', fontWeight: '700', letterSpacing: -0.5 },
  cameraFab: {
    position: 'absolute',
    right: 6,
    bottom: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  displayName: {
    marginTop: 16,
    textAlign: 'center',
    alignSelf: 'center',
  },
  metaRow: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 14,
    width: '100%',
  },
  metaBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
});

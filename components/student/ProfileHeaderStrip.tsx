import React from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { FONT_SANS } from '@/constants/Fonts';
import { useColorScheme } from '@/components/useColorScheme';
type Props = {
  displayName: string;
  deviceId: string;
  verified: boolean;
  verificationLoading?: boolean;
  avatarUri: string | null;
  initials: string;
  photoLoading?: boolean;
  onAvatarPress?: () => void;
};

export function ProfileHeaderStrip({
  displayName,
  deviceId,
  verified,
  verificationLoading,
  avatarUri,
  initials,
  photoLoading,
  onAvatarPress,
}: Props) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const idText = deviceId && deviceId !== '—' ? deviceId : '—';

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onAvatarPress}
        disabled={!onAvatarPress || photoLoading}
        accessibilityRole="button"
        accessibilityLabel="Change profile photo"
        style={({ pressed }) => [pressed && { opacity: 0.9 }]}
      >
        <View style={[styles.avatar, { backgroundColor: c.azure100 }]}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
          ) : (
            <Text style={[styles.initials, { color: c.azure700 }]}>{initials}</Text>
          )}
          {photoLoading ? (
            <View style={[styles.busy, { backgroundColor: `${c.surface}CC` }]}>
              <ActivityIndicator color={c.azure500} />
            </View>
          ) : null}
        </View>
      </Pressable>
      <View style={styles.meta}>
        <Text style={[styles.name, { color: c.ink900 }]} numberOfLines={1}>
          {displayName}
        </Text>
        {verificationLoading ? (
          <ActivityIndicator color={c.azure500} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
        ) : (
          <Text style={[styles.idLine, { color: c.ink500 }]}>
            ID {idText}
            {verified ? (
              <>
                {' · '}
                <Text style={{ color: c.emerald700, fontFamily: FONT_SANS.semibold }}>Verified</Text>
              </>
            ) : null}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: 56, height: 56 },
  initials: {
    fontFamily: FONT_SANS.bold,
    fontSize: 18,
  },
  busy: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: { flex: 1, minWidth: 0, gap: 4 },
  name: {
    fontFamily: FONT_SANS.bold,
    fontSize: 20,
    letterSpacing: -0.3,
  },
  idLine: {
    fontFamily: FONT_SANS.regular,
    fontSize: 15,
    lineHeight: 20,
  },
});

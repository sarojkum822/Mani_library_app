import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import {
  adminEmptyChrome,
  CLARITY_BODY,
  CLARITY_CARD_PADDING,
  CLARITY_SECTION_TITLE,
  useAdminPalette,
} from '@/components/admin/clarityTokens';
import { Button } from '@/components/ui/Button';

type Props = {
  icon?: React.ComponentProps<typeof FontAwesome>['name'];
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function AdminEmptyState({ icon = 'inbox', title, body, actionLabel, onAction }: Props) {
  const c = useAdminPalette();

  return (
    <View style={[styles.wrap, adminEmptyChrome(c)]}>
      <View style={[styles.iconWrap, { backgroundColor: c.surfaceMuted }]}>
        <FontAwesome name={icon} size={22} color={c.ink400} />
      </View>
      <Text style={[CLARITY_SECTION_TITLE, styles.title, { color: c.ink900 }]}>{title}</Text>
      {body ? <Text style={[CLARITY_BODY, styles.body, { color: c.ink600 }]}>{body}</Text> : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} variant="secondary" onPress={onAction} style={styles.btn} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: CLARITY_CARD_PADDING,
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: { textAlign: 'center' },
  body: { textAlign: 'center' },
  btn: { marginTop: 8, alignSelf: 'stretch' },
});

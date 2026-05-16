import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import {
  adminCardChrome,
  CLARITY_CARD_PADDING,
  CLARITY_CHIP_RADIUS,
  CLARITY_KPI_VALUE,
  CLARITY_METRIC_LABEL,
  useAdminPalette,
} from '@/components/admin/clarityTokens';

type Props = {
  label: string;
  value: string;
  hint?: string;
  tone?: 'neutral' | 'warn';
  icon: React.ComponentProps<typeof FontAwesome>['name'];
};

/** Metric tile — Clarity UI: caps label, tabular value, azure accent when needed. */
export function AdminKpiCard({ label, value, hint, tone = 'neutral', icon }: Props) {
  const c = useAdminPalette();
  const iconWrap =
    tone === 'warn'
      ? { bg: c.azure50, fg: c.azure500 }
      : { bg: c.surfaceMuted, fg: c.ink600 };

  return (
    <View style={[styles.card, adminCardChrome(c)]}>
      <View style={styles.top}>
        <Text style={[styles.label, CLARITY_METRIC_LABEL, { color: c.ink500 }]} numberOfLines={2}>
          {label}
        </Text>
        <View style={[styles.iconBox, { backgroundColor: iconWrap.bg }]}>
          <FontAwesome name={icon} size={17} color={iconWrap.fg} />
        </View>
      </View>
      <Text style={[styles.value, CLARITY_KPI_VALUE, { color: c.ink900 }]} selectable={false}>
        {value}
      </Text>
      {hint ? (
        <Text style={[styles.hint, { color: c.ink500 }]} numberOfLines={4}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    minWidth: 148,
    padding: CLARITY_CARD_PADDING,
  },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  label: { flex: 1, paddingRight: 8 },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: CLARITY_CHIP_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { marginTop: 10 },
  hint: { marginTop: 6, fontSize: 12, fontWeight: '400', lineHeight: 16 },
});

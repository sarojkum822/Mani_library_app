import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  adminCardChrome,
  adminKpiValueColor,
  CLARITY_CARD_PADDING,
  CLARITY_HINT,
  CLARITY_HINT_MUTED,
  CLARITY_KPI_VALUE,
  CLARITY_METRIC_LABEL,
  type AdminKpiValueTone,
  useAdminPalette,
} from '@/components/admin/clarityTokens';

type Props = {
  label: string;
  value: string;
  hint?: string;
  hintMuted?: string;
  valueTone?: AdminKpiValueTone;
  tone?: 'neutral' | 'azure';
};

export function AdminMetricTile({ label, value, hint, hintMuted, valueTone = 'neutral', tone = 'neutral' }: Props) {
  const c = useAdminPalette();
  const chrome =
    tone === 'azure'
      ? {
          backgroundColor: c.azure50,
          borderColor: c.azure100,
          borderWidth: StyleSheet.hairlineWidth,
          borderRadius: 16,
        }
      : adminCardChrome(c);

  return (
    <View style={[styles.card, chrome]}>
      <Text style={[CLARITY_METRIC_LABEL, { color: c.ink500 }]}>{label}</Text>
      <Text style={[styles.value, CLARITY_KPI_VALUE, { color: adminKpiValueColor(c, valueTone) }]}>{value}</Text>
      {hint ? (
        <Text style={[CLARITY_HINT, styles.hintGap, { color: c.ink500 }]}>{hint}</Text>
      ) : null}
      {hintMuted ? (
        <Text style={[CLARITY_HINT_MUTED, styles.hintGap, { color: c.ink400 }]}>{hintMuted}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: CLARITY_CARD_PADDING },
  value: { marginTop: 10 },
  hintGap: { marginTop: 8 },
});

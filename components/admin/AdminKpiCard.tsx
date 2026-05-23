import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { adminGlassIconWell } from '@/components/admin/adminGlassTheme';
import {
  adminCardChrome,
  adminKpiValueColor,
  CLARITY_CARD_PADDING,
  CLARITY_CHIP_RADIUS,
  CLARITY_HINT,
  CLARITY_HINT_MUTED,
  CLARITY_KPI_VALUE,
  CLARITY_METRIC_LABEL,
  type AdminGlassAccent,
  type AdminKpiValueTone,
  useAdminPalette,
} from '@/components/admin/clarityTokens';

type Props = {
  label: string;
  value: string;
  hint?: string;
  hintMuted?: string;
  hintFooter?: React.ReactNode;
  valueTone?: AdminKpiValueTone;
  tone?: 'neutral' | 'warn';
  icon: React.ComponentProps<typeof FontAwesome>['name'];
};

/** Metric tile — caps label, colored value, ink-500 / ink-400 hints (web dashboard parity). */
export function AdminKpiCard({
  label,
  value,
  hint,
  hintMuted,
  hintFooter,
  valueTone = 'neutral',
  tone = 'neutral',
  icon,
}: Props) {
  const c = useAdminPalette();
  const glassAccent: AdminGlassAccent =
    valueTone === 'revenue' ? 'revenue' : valueTone === 'success' ? 'success' : 'default';
  const iconFg = tone === 'warn' ? c.azure600 : valueTone === 'revenue' ? c.azure600 : valueTone === 'success' ? c.emerald700 : c.azure500;

  return (
    <View style={[styles.card, adminCardChrome(c, glassAccent)]}>
      <View style={styles.top}>
        <Text style={[styles.label, CLARITY_METRIC_LABEL, { color: c.ink500 }]} numberOfLines={2}>
          {label}
        </Text>
        <View style={[styles.iconBox, adminGlassIconWell(c, glassAccent)]}>
          <FontAwesome name={icon} size={17} color={iconFg} />
        </View>
      </View>
      <Text style={[styles.value, CLARITY_KPI_VALUE, { color: adminKpiValueColor(c, valueTone) }]} selectable={false}>
        {value}
      </Text>
      {hint ? (
        <Text style={[CLARITY_HINT, styles.hintGap, { color: c.ink500 }]} numberOfLines={4}>
          {hint}
        </Text>
      ) : null}
      {hintMuted ? (
        <Text style={[CLARITY_HINT_MUTED, styles.hintGap, { color: c.ink400 }]} numberOfLines={4}>
          {hintMuted}
        </Text>
      ) : null}
      {hintFooter ? <View style={styles.hintGap}>{hintFooter}</View> : null}
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
  hintGap: { marginTop: 6 },
});

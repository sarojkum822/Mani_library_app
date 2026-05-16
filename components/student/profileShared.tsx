import { StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { StatusBadge, type StatusTone } from '@/components/ui/StatusBadge';

const INSTITUTION_LABELS: Record<string, string> = {
  school: 'School',
  college: 'College',
  freelance: 'Freelance / self-study',
  other: 'Other',
};

export function institutionLabel(value: string | null | undefined): string {
  if (!value || !String(value).trim()) return '—';
  return INSTITUTION_LABELS[value] ?? value;
}

export function verificationLabel(status: string): string {
  const s = (status ?? 'none').toLowerCase();
  if (s === 'approved') return 'Verified';
  if (s === 'pending') return 'Pending review';
  if (s === 'rejected') return 'Rejected';
  if (s === 'resubmit') return 'Resubmit requested';
  return 'Not submitted';
}

export function verificationTone(status: string): StatusTone {
  const s = (status ?? 'none').toLowerCase();
  if (s === 'approved') return 'success';
  if (s === 'pending') return 'warning';
  if (s === 'rejected') return 'danger';
  if (s === 'resubmit') return 'warning';
  return 'neutral';
}

export function InfoRow({ label, value, mono, last }: { label: string; value: string; mono?: boolean; last?: boolean }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <View
      style={[
        infoStyles.row,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.ink100 },
      ]}
    >
      <Text style={[infoStyles.label, { color: c.ink500 }]}>{label}</Text>
      <Text
        style={[infoStyles.value, { color: c.ink900 }, mono && infoStyles.mono]}
        numberOfLines={4}
        selectable={mono || label === 'Email'}
      >
        {value}
      </Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
    paddingVertical: 10,
  },
  label: { fontSize: 12, fontWeight: '600' },
  value: { fontSize: 14, fontWeight: '500', textAlign: 'left', alignSelf: 'stretch' },
  mono: { fontFamily: 'SpaceMono', fontSize: 12 },
});

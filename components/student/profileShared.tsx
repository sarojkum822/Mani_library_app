import { StyleSheet, Text, View } from 'react-native';

import { CLARITY_MONO } from '@/components/admin/clarityTokens';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { StatusBadge, type StatusTone } from '@/components/ui/StatusBadge';

const INSTITUTION_LABELS: Record<string, string> = {
  school: 'School',
  college: 'College',
  freelance: 'Freelance / self-study',
  other: 'Other',
};

/** Split phone vs email when legacy rows stored email in `profiles.phone`. */
export function resolveMemberContact(
  profile: { phone?: string; email?: string } | null | undefined,
  user: { phone?: string; email?: string } | null | undefined,
): { phone: string; email: string } {
  let phone = profile?.phone?.trim() || user?.phone?.trim() || '';
  let email = profile?.email?.trim() || user?.email?.trim() || '';
  if (phone.includes('@')) {
    if (!email) email = phone;
    phone = '';
  }
  return { phone: phone || '—', email: email || '—' };
}

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
  if (s === 'staged') return 'Awaiting payment';
  return 'Not submitted';
}

export function verificationTone(status: string): StatusTone {
  const s = (status ?? 'none').toLowerCase();
  if (s === 'approved') return 'success';
  if (s === 'pending' || s === 'staged') return 'warning';
  if (s === 'rejected') return 'danger';
  if (s === 'resubmit') return 'warning';
  return 'neutral';
}

/** UI label when KYC files are queued at checkout but account status is still `none`. */
export function verificationLabelForProfile(
  status: string,
  slots?: { memberStatus: string }[] | null,
): string {
  if (slots?.some((s) => s.memberStatus === 'queued_checkout')) return 'Awaiting payment';
  return verificationLabel(status);
}

export function verificationToneForProfile(
  status: string,
  slots?: { memberStatus: string }[] | null,
): StatusTone {
  if (slots?.some((s) => s.memberStatus === 'queued_checkout')) return 'warning';
  return verificationTone(status);
}

export function InfoRow({
  label,
  value,
  mono,
  last,
  layout = 'stack',
}: {
  label: string;
  value: string;
  mono?: boolean;
  last?: boolean;
  layout?: 'stack' | 'inline';
}) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const border = !last ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.ink100 } : null;

  if (layout === 'inline') {
    const useStack = label === 'Phone' || label === 'Email' || label === 'Preparing for';
    if (useStack) {
      return (
        <View style={[infoStyles.row, border, { paddingHorizontal: 16 }]}>
          <Text style={[infoStyles.label, { color: c.ink600, fontSize: 15, fontWeight: '400' }]}>{label}</Text>
          <Text
            style={[infoStyles.value, { color: c.ink900 }, mono && infoStyles.mono]}
            numberOfLines={4}
            selectable={label === 'Email'}
          >
            {value}
          </Text>
        </View>
      );
    }
    return (
      <View style={[infoStyles.inlineRow, border]}>
        <Text style={[infoStyles.inlineLabel, { color: c.ink600 }]}>{label}</Text>
        <Text
          style={[infoStyles.inlineValue, { color: c.ink900 }, mono && infoStyles.mono]}
          numberOfLines={2}
          selectable={mono}
        >
          {value}
        </Text>
      </View>
    );
  }

  return (
    <View style={[infoStyles.row, border]}>
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
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  label: { fontSize: 12, fontWeight: '600' },
  value: { fontSize: 14, fontWeight: '500', textAlign: 'left', alignSelf: 'stretch' },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  inlineLabel: { flex: 1, fontSize: 15, fontWeight: '400' },
  inlineValue: { flex: 1, flexShrink: 1, minWidth: 0, fontSize: 15, fontWeight: '600', textAlign: 'right' },
  mono: { ...CLARITY_MONO, fontSize: 13 },
});

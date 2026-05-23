import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CLARITY_MONO } from '@/components/admin/clarityTokens';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { StatusBadge, type StatusTone } from '@/components/ui/StatusBadge';
import type { MembershipHistoryEntry } from '@/lib/api';

function formatHistoryDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function historyStatusTone(status: MembershipHistoryEntry['status']): StatusTone {
  if (status === 'paid') return 'success';
  if (status === 'pending') return 'warning';
  if (status === 'failed') return 'danger';
  return 'neutral';
}

function historyStatusLabel(status: MembershipHistoryEntry['status']): string {
  if (status === 'paid') return 'Paid';
  if (status === 'pending') return 'Pending';
  if (status === 'failed') return 'Failed';
  return 'Refunded';
}

export function PaymentHistoryList({ rows }: { rows: MembershipHistoryEntry[] }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  return (
    <View>
      {rows.map((entry, index) => (
        <View
          key={entry.id}
          style={[
            styles.row,
            { borderBottomColor: c.ink100 },
            index === rows.length - 1 && styles.rowLast,
          ]}
        >
          <View style={styles.rowHead}>
            <View style={styles.rowMain}>
              <Text style={[styles.date, { color: c.ink500 }]}>{formatHistoryDate(entry.occurredAt)}</Text>
              <Text style={[styles.title, { color: c.ink900 }]} numberOfLines={2}>
                {entry.title}
              </Text>
              {entry.planName ? (
                <Text style={[styles.plan, { color: c.ink600 }]} numberOfLines={1}>
                  {entry.planName}
                </Text>
              ) : null}
              {entry.periodLabel ? (
                <Text style={[styles.period, { color: c.ink500 }]} numberOfLines={1}>
                  {entry.periodLabel}
                </Text>
              ) : null}
            </View>
            <View style={styles.rowEnd}>
              {entry.amount ? (
                <Text style={[styles.amount, { color: c.ink900 }]}>{entry.amount}</Text>
              ) : null}
              <StatusBadge tone={historyStatusTone(entry.status)} label={historyStatusLabel(entry.status)} />
            </View>
          </View>
          {entry.receiptId ? (
            <Text style={[styles.receipt, { color: c.ink400 }]} selectable numberOfLines={1}>
              {entry.receiptId}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLast: { borderBottomWidth: 0 },
  rowHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  rowMain: { flex: 1, minWidth: 0, gap: 4 },
  rowEnd: { alignItems: 'flex-end', gap: 8, maxWidth: '42%' },
  date: { fontSize: 12, fontWeight: '600' },
  title: { fontSize: 15, fontWeight: '600', lineHeight: 20 },
  plan: { fontSize: 13, fontWeight: '500' },
  period: { fontSize: 12, fontWeight: '400' },
  amount: { fontSize: 16, fontWeight: '700', textAlign: 'right' },
  receipt: { marginTop: 8, fontSize: 11, ...CLARITY_MONO },
});

import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useCallback, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { ADMIN_GROUP_RADIUS } from '@/components/admin/layoutTokens';
import { addDaysIsoYmd, inclusiveDaySpan, isoCompare, isoToDMY, todayIsoYmd } from '@/lib/adminDates';
import { formatDMY } from '@/lib/attendance';
import { useColorScheme } from '@/components/useColorScheme';

export type DateRangePreset = 'today' | 'yesterday' | 'last7' | 'last30' | 'custom';

export type AdminDateRange = {
  fromIso: string;
  toIso: string;
  preset: DateRangePreset;
};

const MAX_RANGE_DAYS = 31;

type Props = {
  value: AdminDateRange;
  onChange: (next: AdminDateRange) => void;
  onApply: () => void;
  applying?: boolean;
};

function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function dateToIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function rangeForPreset(preset: DateRangePreset): { fromIso: string; toIso: string } {
  const today = todayIsoYmd();
  switch (preset) {
    case 'today':
      return { fromIso: today, toIso: today };
    case 'yesterday': {
      const y = addDaysIsoYmd(today, -1);
      return { fromIso: y, toIso: y };
    }
    case 'last7':
      return { fromIso: addDaysIsoYmd(today, -6), toIso: today };
    case 'last30':
      return { fromIso: addDaysIsoYmd(today, -29), toIso: today };
    default:
      return { fromIso: today, toIso: today };
  }
}

function formatRangeLabel(fromIso: string, toIso: string): string {
  const fromDmy = isoToDMY(fromIso);
  const toDmy = isoToDMY(toIso);
  if (fromIso === toIso) return formatDMY(fromDmy);
  return `${formatDMY(fromDmy)} – ${formatDMY(toDmy)}`;
}

const PRESETS: { id: DateRangePreset; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'last7', label: '7 days' },
  { id: 'last30', label: '30 days' },
];

export function AdminDateRangeFilter({ value, onChange, onApply, applying }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  const [picker, setPicker] = useState<'from' | 'to' | null>(null);
  const [rangeError, setRangeError] = useState<string | null>(null);

  const rangeLabel = useMemo(() => formatRangeLabel(value.fromIso, value.toIso), [value.fromIso, value.toIso]);
  const dayCount = inclusiveDaySpan(value.fromIso, value.toIso);

  const selectPreset = useCallback(
    (preset: DateRangePreset) => {
      if (preset === 'custom') {
        onChange({ ...value, preset: 'custom' });
        return;
      }
      const { fromIso, toIso } = rangeForPreset(preset);
      setRangeError(null);
      onChange({ fromIso, toIso, preset });
    },
    [onChange],
  );

  const openPicker = useCallback(
    (field: 'from' | 'to') => {
      setRangeError(null);
      onChange({ ...value, preset: 'custom' });
      setPicker(field);
    },
    [onChange, value],
  );

  const onPickerChange = useCallback(
    (event: DateTimePickerEvent, selected?: Date) => {
      if (Platform.OS === 'android') setPicker(null);
      if (event.type === 'dismissed' || !selected) {
        if (Platform.OS === 'ios') setPicker(null);
        return;
      }
      const iso = dateToIso(selected);
      if (picker === 'from') {
        const toIso = isoCompare(iso, value.toIso) > 0 ? iso : value.toIso;
        onChange({ fromIso: iso, toIso, preset: 'custom' });
      } else if (picker === 'to') {
        const fromIso = isoCompare(value.fromIso, iso) > 0 ? iso : value.fromIso;
        onChange({ fromIso, toIso: iso, preset: 'custom' });
      }
      if (Platform.OS === 'android') setPicker(null);
    },
    [onChange, picker, value.fromIso, value.toIso],
  );

  const validateAndApply = useCallback(() => {
    if (isoCompare(value.fromIso, value.toIso) > 0) {
      setRangeError('End date must be on or after the start date.');
      return;
    }
    if (inclusiveDaySpan(value.fromIso, value.toIso) > MAX_RANGE_DAYS) {
      setRangeError(`Choose a range of ${MAX_RANGE_DAYS} days or fewer.`);
      return;
    }
    setRangeError(null);
    onApply();
  }, [onApply, value.fromIso, value.toIso]);

  const pickerDate = picker === 'from' ? isoToDate(value.fromIso) : isoToDate(value.toIso);

  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Text style={[styles.heading, { color: c.ink900 }]}>Date range</Text>
      <Text style={[styles.sub, { color: c.ink500 }]}>
        {rangeLabel} · {dayCount} day{dayCount === 1 ? '' : 's'}
      </Text>

      <View style={styles.presetRow}>
        {PRESETS.map((p) => {
          const active = value.preset === p.id;
          return (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => selectPreset(p.id)}
              style={({ pressed }) => [
                styles.presetChip,
                {
                  borderColor: active ? c.azure500 : c.border,
                  backgroundColor: active ? c.azure50 : c.surfaceMuted,
                },
                pressed && { opacity: 0.88 },
              ]}
            >
              <Text style={[styles.presetText, { color: active ? c.azure700 : c.ink700 }]}>{p.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.dateRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start date"
          onPress={() => openPicker('from')}
          style={({ pressed }) => [
            styles.dateField,
            { borderColor: c.border, backgroundColor: c.surfaceMuted },
            pressed && { opacity: 0.9 },
          ]}
        >
          <Text style={[styles.dateLabel, { color: c.ink500 }]}>From</Text>
          <Text style={[styles.dateValue, { color: c.ink900 }]}>{formatDMY(isoToDMY(value.fromIso))}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="End date"
          onPress={() => openPicker('to')}
          style={({ pressed }) => [
            styles.dateField,
            { borderColor: c.border, backgroundColor: c.surfaceMuted },
            pressed && { opacity: 0.9 },
          ]}
        >
          <Text style={[styles.dateLabel, { color: c.ink500 }]}>To</Text>
          <Text style={[styles.dateValue, { color: c.ink900 }]}>{formatDMY(isoToDMY(value.toIso))}</Text>
        </Pressable>
      </View>

      {rangeError ? <Text style={[styles.error, { color: c.azure700 }]}>{rangeError}</Text> : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Load attendance for selected dates"
        onPress={validateAndApply}
        disabled={applying}
        style={({ pressed }) => [
          styles.applyBtn,
          { backgroundColor: c.azure500, opacity: applying || pressed ? 0.9 : 1 },
        ]}
      >
        <Text style={styles.applyText}>{applying ? 'Loading…' : 'Load attendance'}</Text>
      </Pressable>

      {picker && Platform.OS === 'ios' ? (
        <Modal transparent animationType="slide" visible onRequestClose={() => setPicker(null)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setPicker(null)} />
          <View style={[styles.modalSheet, { backgroundColor: c.surface }]}>
            <View style={[styles.modalBar, { borderBottomColor: c.border }]}>
              <Pressable onPress={() => setPicker(null)} hitSlop={12}>
                <Text style={[styles.modalDone, { color: c.azure600 }]}>Done</Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={pickerDate}
              mode="date"
              display="inline"
              maximumDate={new Date()}
              onChange={onPickerChange}
            />
          </View>
        </Modal>
      ) : null}

      {picker && Platform.OS === 'android' ? (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={onPickerChange}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: ADMIN_GROUP_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
  },
  heading: { fontSize: 16, fontWeight: '600', letterSpacing: -0.2 },
  sub: { fontSize: 13, fontWeight: '500', marginTop: -4 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  presetText: { fontSize: 13, fontWeight: '600' },
  dateRow: { flexDirection: 'row', gap: 10 },
  dateField: {
    flex: 1,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 56,
    justifyContent: 'center',
  },
  dateLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  dateValue: { marginTop: 4, fontSize: 16, fontWeight: '600' },
  error: { fontSize: 14, fontWeight: '500' },
  applyBtn: {
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(16,24,40,0.35)' },
  modalSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  modalBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalDone: { fontSize: 17, fontWeight: '600' },
});

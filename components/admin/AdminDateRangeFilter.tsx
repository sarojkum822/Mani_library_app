import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import FontAwesome from '@expo/vector-icons/FontAwesome';
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
  onApply: (range: AdminDateRange) => void;
  applying?: boolean;
  variant?: 'default' | 'minimal';
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

export function AdminDateRangeFilter({ value, onChange, onApply, applying, variant = 'default' }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  const [picker, setPicker] = useState<'from' | 'to' | null>(null);
  const [pickerDraft, setPickerDraft] = useState<Date>(() => new Date());
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
      const next: AdminDateRange = { fromIso, toIso, preset };
      onChange(next);
      onApply(next);
    },
    [onApply, onChange, value],
  );

  const openPicker = useCallback(
    (field: 'from' | 'to') => {
      setRangeError(null);
      const seed = field === 'from' ? isoToDate(value.fromIso) : isoToDate(value.toIso);
      setPickerDraft(seed);
      onChange({ ...value, preset: 'custom' });
      setPicker(field);
    },
    [onChange, value],
  );

  const applyRange = useCallback(
    (fromIso: string, toIso: string) => {
      if (isoCompare(fromIso, toIso) > 0) {
        setRangeError('End date must be on or after the start date.');
        return false;
      }
      if (inclusiveDaySpan(fromIso, toIso) > MAX_RANGE_DAYS) {
        setRangeError(`Choose a range of ${MAX_RANGE_DAYS} days or fewer.`);
        return false;
      }
      setRangeError(null);
      const next: AdminDateRange = { fromIso, toIso, preset: 'custom' };
      onChange(next);
      onApply(next);
      return true;
    },
    [onApply, onChange],
  );

  const commitPicker = useCallback(() => {
    if (!picker) return;
    const iso = dateToIso(pickerDraft);
    let fromIso = value.fromIso;
    let toIso = value.toIso;
    if (picker === 'from') {
      fromIso = iso;
      if (isoCompare(iso, toIso) > 0) toIso = iso;
    } else {
      toIso = iso;
      if (isoCompare(fromIso, iso) > 0) fromIso = iso;
    }
    if (applyRange(fromIso, toIso)) setPicker(null);
  }, [applyRange, picker, pickerDraft, value.fromIso, value.toIso]);

  const onPickerChange = useCallback(
    (event: DateTimePickerEvent, selected?: Date) => {
      if (Platform.OS === 'android') {
        const field = picker;
        setPicker(null);
        if (event.type === 'dismissed' || !selected || !field) return;
        const iso = dateToIso(selected);
        let fromIso = value.fromIso;
        let toIso = value.toIso;
        if (field === 'from') {
          fromIso = iso;
          if (isoCompare(iso, toIso) > 0) toIso = iso;
        } else {
          toIso = iso;
          if (isoCompare(fromIso, iso) > 0) fromIso = iso;
        }
        applyRange(fromIso, toIso);
        return;
      }
      if (event.type === 'dismissed') return;
      if (selected) setPickerDraft(selected);
    },
    [applyRange, picker, value.fromIso, value.toIso],
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
    onApply(value);
  }, [onApply, value]);

  const minimal = variant === 'minimal';

  return (
    <View style={[minimal ? styles.minimalWrap : styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
      {minimal ? (
        <Text style={[styles.minimalLabel, { color: c.ink500 }]}>
          {rangeLabel} · {dayCount} day{dayCount === 1 ? '' : 's'}
        </Text>
      ) : (
        <>
          <Text style={[styles.heading, { color: c.ink900 }]}>Date range</Text>
          <Text style={[styles.sub, { color: c.ink500 }]}>
            {rangeLabel} · {dayCount} day{dayCount === 1 ? '' : 's'}
          </Text>
        </>
      )}

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
          hitSlop={4}
          style={({ pressed }) => [
            styles.dateField,
            { borderColor: c.border, backgroundColor: c.surfaceMuted },
            pressed && { opacity: 0.9 },
          ]}
        >
          <Text style={[styles.dateLabel, { color: c.ink500 }]} pointerEvents="none">
            From
          </Text>
          <View style={styles.dateValueRow} pointerEvents="none">
            <Text style={[styles.dateValue, { color: c.ink900 }]}>{formatDMY(isoToDMY(value.fromIso))}</Text>
            <FontAwesome name="calendar" size={14} color={c.azure500} />
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="End date"
          onPress={() => openPicker('to')}
          hitSlop={4}
          style={({ pressed }) => [
            styles.dateField,
            { borderColor: c.border, backgroundColor: c.surfaceMuted },
            pressed && { opacity: 0.9 },
          ]}
        >
          <Text style={[styles.dateLabel, { color: c.ink500 }]} pointerEvents="none">
            To
          </Text>
          <View style={styles.dateValueRow} pointerEvents="none">
            <Text style={[styles.dateValue, { color: c.ink900 }]}>{formatDMY(isoToDMY(value.toIso))}</Text>
            <FontAwesome name="calendar" size={14} color={c.azure500} />
          </View>
        </Pressable>
      </View>

      {rangeError ? <Text style={[styles.error, { color: c.azure700 }]}>{rangeError}</Text> : null}

      {!minimal ? (
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
      ) : null}

      {picker && Platform.OS === 'android' ? (
        <DateTimePicker
          value={pickerDraft}
          mode="date"
          display="calendar"
          maximumDate={new Date()}
          onChange={onPickerChange}
        />
      ) : null}

      {picker && Platform.OS !== 'android' ? (
        <Modal transparent animationType="slide" visible onRequestClose={() => setPicker(null)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setPicker(null)} />
          <View style={[styles.modalSheet, { backgroundColor: c.surface }]}>
            <View style={[styles.modalBar, { borderBottomColor: c.border }]}>
              <Pressable onPress={() => setPicker(null)} hitSlop={12}>
                <Text style={[styles.modalCancel, { color: c.ink600 }]}>Cancel</Text>
              </Pressable>
              <Text style={[styles.modalTitle, { color: c.ink900 }]}>
                {picker === 'from' ? 'Start date' : 'End date'}
              </Text>
              <Pressable onPress={commitPicker} hitSlop={12}>
                <Text style={[styles.modalDone, { color: c.azure600 }]}>Apply</Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={pickerDraft}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'spinner'}
              maximumDate={new Date()}
              onChange={onPickerChange}
            />
          </View>
        </Modal>
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
  minimalWrap: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 10,
  },
  minimalLabel: { fontSize: 13, fontWeight: '500' },
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
  dateValueRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  dateValue: { fontSize: 16, fontWeight: '600', flex: 1 },
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: { fontSize: 16, fontWeight: '600' },
  modalCancel: { fontSize: 16, fontWeight: '500' },
  modalDone: { fontSize: 17, fontWeight: '600' },
});

import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import Colors from '@/constants/Colors';
import {
  DEFAULT_LIBRARY_TZ,
  daysInMonth,
  formatYearMonthLabel,
  formatYmdLong,
  formatYmdShort,
  isOnOrAfterYmd,
  membershipInclusiveEndYmd,
  shiftYearMonth,
  weekdayOfParts,
  yearMonthFromYmd,
  ymdFromParts,
} from '@/lib/membershipHubDates';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** Fixed square day tiles — keeps numbers centered and calendar compact. */
const DAY_TILE = 30;
const DAY_ROW = 34;

type Props = {
  value: string;
  minYmd: string;
  maxYmd: string;
  onChange: (ymd: string) => void;
  /** 1, 3, or 6 — shows inclusive membership end at the bottom of the card. */
  calendarMonths?: 1 | 3 | 6;
  c: (typeof Colors)['light'];
};

function isSelectable(ymd: string, minYmd: string, maxYmd: string): boolean {
  return isOnOrAfterYmd(ymd, minYmd) && ymd <= maxYmd;
}

export function MembershipStartDateCalendar({ value, minYmd, maxYmd, onChange, calendarMonths, c }: Props) {
  const [viewYm, setViewYm] = useState(() => yearMonthFromYmd(value));

  const endYmd = useMemo(
    () => (calendarMonths ? membershipInclusiveEndYmd(value, calendarMonths) : null),
    [value, calendarMonths],
  );
  const durationLabel = calendarMonths === 1 ? '1 month' : calendarMonths ? `${calendarMonths} months` : null;

  useEffect(() => {
    setViewYm(yearMonthFromYmd(value));
  }, [value]);

  const minYm = yearMonthFromYmd(minYmd);
  const maxYm = yearMonthFromYmd(maxYmd);
  const canPrevMonth = viewYm > minYm;
  const canNextMonth = viewYm < maxYm;

  const cells = useMemo(() => {
    const [y, m] = viewYm.split('-').map(Number);
    if (!y || !m) return [];

    const totalDays = daysInMonth(y, m);
    const leading = weekdayOfParts(y, m, 1);
    const out: Array<{ key: string; ymd: string | null }> = [];

    for (let i = 0; i < leading; i += 1) {
      out.push({ key: `pad-${i}`, ymd: null });
    }
    for (let day = 1; day <= totalDays; day += 1) {
      const ymd = ymdFromParts(y, m, day);
      out.push({ key: ymd, ymd });
    }
    return out;
  }, [viewYm]);

  return (
    <View style={[styles.wrap, { borderColor: c.border, backgroundColor: c.surface }]}>
      <View style={styles.selectedRow}>
        <FontAwesome name="calendar" size={14} color={c.azure500} />
        <Text style={[styles.selectedLabel, { color: c.ink900 }]}>{formatYmdLong(value)}</Text>
      </View>

      <View style={styles.monthNav}>
        <Pressable
          accessibilityLabel="Previous month"
          disabled={!canPrevMonth}
          onPress={() => canPrevMonth && setViewYm((prev) => shiftYearMonth(prev, -1))}
          style={({ pressed }) => [styles.navBtn, !canPrevMonth && styles.navBtnDisabled, pressed && canPrevMonth && { opacity: 0.7 }]}
        >
          <FontAwesome name="chevron-left" size={12} color={canPrevMonth ? c.azure600 : c.ink300} />
        </Pressable>
        <Text style={[styles.monthTitle, { color: c.ink900 }]}>{formatYearMonthLabel(viewYm)}</Text>
        <Pressable
          accessibilityLabel="Next month"
          disabled={!canNextMonth}
          onPress={() => canNextMonth && setViewYm((prev) => shiftYearMonth(prev, 1))}
          style={({ pressed }) => [styles.navBtn, !canNextMonth && styles.navBtnDisabled, pressed && canNextMonth && { opacity: 0.7 }]}
        >
          <FontAwesome name="chevron-right" size={12} color={canNextMonth ? c.azure600 : c.ink300} />
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((d) => (
          <Text key={d} style={[styles.weekday, { color: c.ink500 }]}>
            {d}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((cell) => {
          if (!cell.ymd) {
            return <View key={cell.key} style={styles.dayCell} />;
          }

          const ymd = cell.ymd;
          const selectable = isSelectable(ymd, minYmd, maxYmd);
          const selected = ymd === value;
          const isToday = ymd === minYmd;

          return (
            <View key={cell.key} style={styles.dayCell}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected, disabled: !selectable }}
                accessibilityLabel={ymd}
                disabled={!selectable}
                onPress={() => onChange(ymd)}
                style={({ pressed }) => [
                  styles.dayTile,
                  selected && { backgroundColor: c.azure500 },
                  !selected && selectable && isToday && { backgroundColor: c.azure50, borderColor: c.azure200, borderWidth: 1 },
                  !selected && selectable && pressed && { backgroundColor: c.surfaceMuted },
                ]}
              >
                <Text
                  style={[
                    styles.dayNum,
                    { color: selectable ? (selected ? '#fff' : c.ink900) : c.ink300 },
                    selected && { fontWeight: '700' },
                  ]}
                >
                  {Number(ymd.slice(8, 10))}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      {endYmd && durationLabel ? (
        <View style={[styles.periodCard, { backgroundColor: c.azure50, borderColor: c.azure200 }]}>
          <Text style={[styles.periodKicker, { color: c.azure700 }]}>Your membership period</Text>
          <View style={styles.periodRangeRow}>
            <View style={styles.periodDateCol}>
              <Text style={[styles.periodDateLabel, { color: c.ink500 }]}>Starts</Text>
              <Text style={[styles.periodDateValue, { color: c.ink900 }]}>{formatYmdShort(value)}</Text>
            </View>
            <FontAwesome name="long-arrow-right" size={18} color={c.azure500} style={styles.periodArrow} />
            <View style={styles.periodDateCol}>
              <Text style={[styles.periodDateLabel, { color: c.ink500 }]}>Ends</Text>
              <Text style={[styles.periodDateValue, { color: c.ink900 }]}>{formatYmdShort(endYmd)}</Text>
            </View>
          </View>
          <Text style={[styles.periodNote, { color: c.ink600 }]}>
            {durationLabel} · access through the end date ({DEFAULT_LIBRARY_TZ} calendar)
          </Text>
        </View>
      ) : (
        <Text style={[styles.tzHint, { color: c.ink500 }]}>
          Library dates ({DEFAULT_LIBRARY_TZ}). You can book starts through {formatYmdShort(maxYmd)}.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 10,
    gap: 8,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 300,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 17,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnDisabled: { opacity: 0.45 },
  monthTitle: { fontSize: 14, fontWeight: '700', letterSpacing: -0.2 },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  weekday: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.15,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: DAY_ROW,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayTile: {
    width: DAY_TILE,
    height: DAY_TILE,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNum: {
    fontSize: 13,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    lineHeight: Platform.OS === 'android' ? 13 : 15,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
  },
  tzHint: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 16,
  },
  periodCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  periodKicker: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  periodRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  periodDateCol: { flex: 1, minWidth: 0, gap: 4 },
  periodDateLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' },
  periodDateValue: { fontSize: 13, fontWeight: '700', lineHeight: 17 },
  periodArrow: { marginTop: 10 },
  periodNote: { fontSize: 11, fontWeight: '500', lineHeight: 15 },
});

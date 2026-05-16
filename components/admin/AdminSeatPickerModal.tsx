import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { LibrarySeatMap } from '@/components/join/LibrarySeatMap';
import { LibrarySeatMapRows } from '@/components/join/LibrarySeatMapRows';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { durationOptionsForPlan, type ManualPlanKind } from '@/lib/adminPricing';
import { isoToDMY } from '@/lib/adminDates';
import { formatDMY } from '@/lib/attendance';

export type AdminSeatPickerPanelProps = {
  token: string;
  planKind: ManualPlanKind;
  startDate: string;
  durationKey: string;
  selectedSeatId: number | null;
  onSelect: (seatNo: number) => void;
  onClose: () => void;
};

function seatCode(planKind: ManualPlanKind, seatNo: number): string {
  return planKind === 'long_term' ? `F${seatNo}` : `S${seatNo}`;
}

/**
 * Full-screen seat map (no nested Modal — render inside an existing sheet Modal).
 * iOS does not reliably show a second Modal stacked on a pageSheet.
 */
export function AdminSeatPickerPanel({
  token,
  planKind,
  startDate,
  durationKey,
  selectedSeatId,
  onSelect,
  onClose,
}: AdminSeatPickerPanelProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const useRowsLayout = planKind === 'short_term';

  const [draftSeat, setDraftSeat] = useState<number | null>(selectedSeatId);
  const [occupied, setOccupied] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    setDraftSeat(selectedSeatId);
  }, [selectedSeatId]);

  useEffect(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      setOccupied(new Set());
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadErr(null);
    void (async () => {
      try {
        const seats = await api.seatOccupancy(token, planKind, { startDate, durationKey });
        if (!cancelled) setOccupied(new Set(seats));
      } catch (e: unknown) {
        if (!cancelled) {
          setOccupied(new Set());
          setLoadErr(e instanceof Error ? e.message : 'Could not load seat occupancy.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, planKind, startDate, durationKey]);

  const durationLabel = useMemo(() => {
    const opts = durationOptionsForPlan(planKind);
    return opts.find((o) => o.key === durationKey)?.label ?? durationKey;
  }, [durationKey, planKind]);

  const rangeLabel = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return 'Set a valid start date';
    return `Starts ${formatDMY(isoToDMY(startDate))} · ${durationLabel}`;
  }, [durationLabel, startDate]);

  const hallLabel = planKind === 'long_term' ? 'Main hall (F seats)' : 'Row hall (S seats)';

  function confirm() {
    if (draftSeat == null) return;
    if (occupied.has(draftSeat)) return;
    onSelect(draftSeat);
    onClose();
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.surfaceMuted }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: c.border, backgroundColor: c.surface }]}>
        <Pressable onPress={onClose} accessibilityRole="button" hitSlop={12} style={styles.backHit}>
          <Text style={{ color: c.azure600, fontWeight: '600', fontSize: 16 }}>← Back</Text>
        </Pressable>
        <Text style={[styles.title, { color: c.ink900 }]}>Select seat</Text>
        <Text style={[styles.sub, { color: c.ink600 }]}>
          {hallLabel} · {rangeLabel}
        </Text>
        <Text style={[styles.legendHint, { color: c.ink500 }]}>
          Amber = occupied · Blue = free · Green = selected
        </Text>
      </View>

      {loadErr ? (
        <Text style={[styles.errBanner, { color: c.azure700, backgroundColor: c.azure50 }]}>{loadErr}</Text>
      ) : null}

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={c.azure500} size="large" />
          <Text style={[styles.loadingText, { color: c.ink500 }]}>Loading taken seats…</Text>
        </View>
      ) : null}

      <ScrollView
        style={styles.mapScroll}
        contentContainerStyle={styles.mapScrollContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {useRowsLayout ? (
          <LibrarySeatMapRows
            occupiedSeatIds={occupied}
            selectedSeatId={draftSeat}
            onSelectSeat={setDraftSeat}
            interactive
          />
        ) : (
          <LibrarySeatMap
            occupiedSeatIds={occupied}
            selectedSeatId={draftSeat}
            onSelectSeat={setDraftSeat}
            interactive
          />
        )}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: c.border, backgroundColor: c.surface }]}>
        <View style={[styles.ticket, { backgroundColor: c.surfaceMuted, borderColor: c.border }]}>
          <MaterialCommunityIcons name="desk" size={20} color={c.azure600} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.ticketLabel, { color: c.ink500 }]}>Selected desk</Text>
            <Text style={[styles.ticketValue, { color: draftSeat != null ? c.ink900 : c.ink400 }]}>
              {draftSeat != null ? `${seatCode(planKind, draftSeat)} · Seat ${draftSeat}` : 'Tap a free seat'}
            </Text>
          </View>
        </View>
        <Button
          title={draftSeat != null ? `Use seat ${seatCode(planKind, draftSeat)}` : 'Select a seat on the map'}
          disabled={draftSeat == null || (draftSeat != null && occupied.has(draftSeat))}
          onPress={confirm}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingTop: Platform.OS === 'ios' ? 4 : 8,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  backHit: { alignSelf: 'flex-start', marginBottom: 4 },
  title: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  sub: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  legendHint: { fontSize: 12, lineHeight: 17, fontWeight: '400', marginTop: 2 },
  errBanner: {
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 120 },
  loadingText: { fontSize: 14, fontWeight: '500' },
  mapScroll: { flex: 1 },
  mapScrollContent: { paddingHorizontal: 8, paddingVertical: 12, paddingBottom: 24, flexGrow: 1 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 8 : 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  ticket: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  ticketLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  ticketValue: { marginTop: 2, fontSize: 17, fontWeight: '700' },
});

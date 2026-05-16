import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { LayoutChangeEvent, TextStyle, ViewStyle } from 'react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

import { DEFAULT_BLOCKED_SEAT_IDS } from '@/components/join/LibrarySeatMap';
import {
  ALL_ROWS_LAYOUT_SEAT_NUMBERS,
  ROWS_ADDITIONAL_BLOCKED_SEAT_IDS,
  ROWS_SEAT_BLOCKS,
  type RowsSeatBlockSpec,
} from '@/lib/shortTermRowsSeatLayout';

/** Default blocked seats for rows layout: shared Mani list plus short-term extras (43, 46, 54). */
export const ROWS_DEFAULT_BLOCKED_SEAT_IDS: ReadonlySet<number> = new Set([
  ...Array.from(DEFAULT_BLOCKED_SEAT_IDS),
  ...Array.from(ROWS_ADDITIONAL_BLOCKED_SEAT_IDS),
]);

const INK = '#111827';
const LINE = 'rgba(17, 24, 39, 0.72)';
const SURFACE = '#FFFFFF';
const FLOOR = '#F7F7FB';
const AISLE = 'transparent';
const FLOOR_INNER_PADDING_TOP = 12;
/** Floor strip below Row 1 + room for stairs–door footprint. */
/** Margin below seating so Row 1 clears the shorter stairs–door box with visible floor gap. */
const STAIRS_TOP_CLEARANCE = 224;
/** Matches `LibrarySeatMap` chair / desk hit targets */
/** Cinema-style palette (available = sky ring + sky chair, occupied = amber, selected = solid green). */
const SEAT_AVAILABLE_BORDER = '#7DD3FC';
const SEAT_AVAILABLE_DESK_FILL = '#FFFFFF';
const AVAILABLE_CHAIR = '#0EA5E9';

const SEAT_OCCUPIED_BORDER = '#FFC107';
const SEAT_OCCUPIED_DESK_FILL = '#FFFFFF';
const OCCUPIED_CHAIR = '#EAB308';

const SEAT_SELECTED_FILL = '#28A745';
const SEAT_SELECTED_BORDER = '#23953C';
const SELECTED_CHAIR = '#28A745';

const BLOCKED_CHAIR = '#94A3B8';

/** Selected desk: solid green fill; seat number uses white (`deskSeatNoSelected`). */
const SEAT_SELECTED_DESK_FILL = SEAT_SELECTED_FILL;
const SEAT_SELECTED_DESK_BORDER = SEAT_SELECTED_BORDER;
const DESK_GAP = 6;

/** Scroll padding — mirrors `LibrarySeatMap` horizontal scroll */
const scrollContentPadding: ViewStyle = { paddingRight: 36 };

/** Window lintel text */
const windowSideText: TextStyle = {
  marginTop: 3,
  fontSize: 7,
  fontWeight: '800',
  letterSpacing: 0.3,
  textAlign: 'center',
};

export type LibrarySeatMapRowsProps = {
  occupiedSeatIds?: ReadonlySet<number>;
  blockedSeatIds?: ReadonlySet<number>;
  selectedSeatId?: number | null;
  onSelectSeat?: (seatNo: number) => void;
  interactive?: boolean;
};

export function LibrarySeatMapRows({
  occupiedSeatIds = new Set(),
  blockedSeatIds = ROWS_DEFAULT_BLOCKED_SEAT_IDS,
  selectedSeatId = null,
  onSelectSeat,
  interactive = true,
}: LibrarySeatMapRowsProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  const layoutSet = useMemo(() => new Set(ALL_ROWS_LAYOUT_SEAT_NUMBERS), []);

  const selectableCount = useMemo(() => {
    let n = 0;
    for (const s of ALL_ROWS_LAYOUT_SEAT_NUMBERS) {
      if (blockedSeatIds.has(s)) continue;
      if (occupiedSeatIds.has(s)) continue;
      n += 1;
    }
    return n;
  }, [occupiedSeatIds, blockedSeatIds]);

  /** Y-offset of two-column seating row (`columnsRow`) within `floorInner` — aligns WC & door overlays. */
  const [columnsRowY, setColumnsRowY] = useState(0);

  /** Row 1 bench shell layout (coords relative to `rowsVerticalStack` in the left column). */
  const [bottomRowGeom, setBottomRowGeom] = useState<{ left: number; top: number; w: number; h: number } | undefined>(
    undefined,
  );

  /** WC on left wall centered on Row 1 (lower desk tier). */
  const wcStripeTop = useMemo(() => {
    if (!bottomRowGeom) return undefined;
    const wcH = 28;
    return Math.max(0, columnsRowY + bottomRowGeom.top + bottomRowGeom.h / 2 - wcH / 2 + 8);
  }, [bottomRowGeom, columnsRowY]);

  const doorMarkerPos = useMemo(() => {
    if (!bottomRowGeom) return undefined;
    return {
      left: bottomRowGeom.left + bottomRowGeom.w,
      top: columnsRowY + bottomRowGeom.top + bottomRowGeom.h + 2,
    };
  }, [bottomRowGeom, columnsRowY]);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={scrollContentPadding}>
      <View style={styles.horizontalPad}>
        <View style={[styles.room, { borderColor: LINE }]}>
          <View style={styles.topWall} />

          <View style={styles.middleBand}>
            <View style={[styles.leftWallStripe, { backgroundColor: SURFACE, borderRightColor: LINE }]}>
              <View style={styles.wallEquipAcMid}>
                <MaterialCommunityIcons name="air-conditioner" size={11} color={c.ink500} />
                <Text style={[styles.equipLabel, { color: c.ink400, marginTop: 2 }]}>AC</Text>
              </View>
              <View
                style={[
                  styles.wallEquipWc,
                  wcStripeTop != null ? { top: wcStripeTop } : { top: '76%' },
                ]}
              >
                <View style={styles.wcBox}>
                  <MaterialCommunityIcons name="toilet" size={11} color="#1F7A4D" />
                  <Text style={[styles.equipLabel, { color: '#1F7A4D', marginTop: 2 }]}>WC</Text>
                </View>
              </View>
            </View>

            <View style={[styles.floor, { backgroundColor: FLOOR }]}>
              <View style={styles.floorInner}>
                <View style={styles.metaRow}>
                  <Text style={[styles.metaText, { color: c.ink600 }]}>
                    Selected: {selectedSeatId != null ? 1 : 0}
                    {' · '}
                    Available: {selectableCount}
                  </Text>
                </View>

                {/* Long-term footprint: left block column · vertical aisle · right walk column (toward window / stairs). */}
                <View
                  style={[styles.columnsRow, styles.columnsRowAboveStairs]}
                  collapsable={false}
                  onLayout={(e) => setColumnsRowY(e.nativeEvent.layout.y)}
                >
                  <View style={[styles.blockColumn, styles.rowsLeftBlockColumn]}>
                    <View style={styles.rowsVerticalStack}>
                      {ROWS_SEAT_BLOCKS.map((spec, idx) => (
                        <React.Fragment key={spec.rowIndex}>
                          <RowsBenchBlock
                            spec={spec}
                            occupiedSeatIds={occupiedSeatIds}
                            blockedSeatIds={blockedSeatIds}
                            selectedSeatId={selectedSeatId}
                            onSelectSeat={onSelectSeat}
                            interactive={interactive}
                            layoutSet={layoutSet}
                            onBottomBenchLayout={spec.rowIndex === 1 ? (geom) => setBottomRowGeom(geom) : undefined}
                          />

                          {idx === 0 ? (
                            <View style={[styles.horizontalAisle, { backgroundColor: AISLE }]} />
                          ) : null}

                          {idx === 1 ? (
                            <View style={[styles.horizontalAisle, styles.rowTightGap, { backgroundColor: AISLE }]} />
                          ) : null}
                        </React.Fragment>
                      ))}
                    </View>
                  </View>

                  <View style={[styles.verticalAisle, { backgroundColor: AISLE }]} />

                  <View style={[styles.blockColumn, styles.rowsRightWalkColumn]}>
                    <View style={styles.rowsRightWalkSpacer} />
                    {/* Walk cushion above stairs/window strip — matches long-term bottom-right */}
                    <View style={styles.walkGapUnderLowerRightDesk} />
                  </View>
                </View>

                <WindowSideStrip
                  glassTint="rgba(147, 197, 253, 0.45)"
                  labelColor={c.ink600}
                />

                <View pointerEvents="none" style={styles.doorSideLabelAbs}>
                  <MaterialCommunityIcons name="door-open" size={14} color={LINE} />
                  <Text style={[styles.equipLabel, { color: LINE, marginTop: 4 }]}>Door</Text>
                </View>

                {doorMarkerPos ? (
                  <View
                    pointerEvents="none"
                    style={[styles.doorOpeningAbs, { left: doorMarkerPos.left, top: doorMarkerPos.top }]}
                  >
                    <View style={styles.doorGap} />
                    <View style={styles.doorLeafLine} />
                  </View>
                ) : null}

                {doorMarkerPos ? (
                  <View pointerEvents="none" style={[styles.doorJambDown, { left: doorMarkerPos.left }]} />
                ) : null}

                {/* Stairs pinned bottom-right only — clear floor to the left of the box + below Row 1 */}
                <View pointerEvents="none" style={styles.stairsAbs}>
                  <DoorAndStairs inkMuted={c.ink500} />
                </View>
              </View>
            </View>
          </View>

          <View style={[styles.bottomWall, { borderTopColor: LINE }]}>
            <View style={styles.bottomWallInner} />
          </View>
        </View>

        <View style={[styles.legend, { backgroundColor: c.surface, borderColor: c.border }]}>
          <LegendSeatItem label="Available" variant="available" textColor={c.ink700} />
          <LegendSeatItem label="Occupied" variant="occupied" textColor={c.ink700} />
          <LegendSeatItem label="Not available" variant="blocked" textColor={c.ink700} />
          <LegendSeatItem label="Selected" variant="selected" textColor={c.ink700} />
        </View>
      </View>
    </ScrollView>
  );
}

function LegendSeatItem({
  label,
  variant,
  textColor,
}: {
  label: string;
  variant: 'available' | 'occupied' | 'selected' | 'blocked';
  textColor: string;
}) {
  return (
    <View style={styles.legendItem}>
      {variant === 'available' ? (
        <View style={[styles.legendSwatch, styles.legendSwatchAvailable]} />
      ) : variant === 'occupied' ? (
        <View style={[styles.legendSwatch, styles.legendSwatchOccupied]} />
      ) : variant === 'blocked' ? (
        <View style={styles.legendSwatchBlocked}>
          <MaterialCommunityIcons name="close-thick" size={9} color="#B91C1C" />
        </View>
      ) : (
        <View style={[styles.legendSwatch, styles.legendSwatchSelected]} />
      )}
      <Text style={[styles.legendText, { color: textColor }]}>{label}</Text>
    </View>
  );
}

function WindowSideStrip({ glassTint, labelColor }: { glassTint: string; labelColor: string }) {
  const rows = 5;
  const cols = 2;
  return (
    <View pointerEvents="none" style={styles.windowStripeAbs}>
      <View style={styles.windowFrame}>
        <View style={styles.windowLintel}>
          <MaterialCommunityIcons name="window-closed-variant" size={12} color={LINE} />
          <Text style={[windowSideText, { color: labelColor }]} numberOfLines={2}>
            Window side
          </Text>
        </View>
        <View style={styles.windowGrid}>
          {Array.from({ length: cols }).map((_, col) => (
            <View key={col} style={[styles.windowCol, col === cols - 1 ? styles.windowColLast : null]}>
              {Array.from({ length: rows }).map((_, r) => (
                <View
                  key={r}
                  style={[
                    styles.windowPane,
                    { backgroundColor: glassTint },
                    r === rows - 1 ? styles.windowPaneLast : null,
                  ]}
                />
              ))}
            </View>
          ))}
        </View>
        <View style={styles.windowSill} />
      </View>
    </View>
  );
}

function DoorAndStairs({ inkMuted }: { inkMuted: string }) {
  return (
    <View style={styles.doorStairs}>
      <View style={styles.stairsLeftJoin} pointerEvents="none" />
      <View style={styles.doorStairsRow}>
        {/* Upper-wall band + tall door leaf; bottom of leaf lines up ~with mid “lower” schematic wall */}
        <View style={styles.doorLane}>
          <View style={styles.doorUpperWall}>
            <Text style={[styles.equipLabel, { color: LINE }]}>Door</Text>
            <FontAwesome name="long-arrow-up" size={13} color={inkMuted} />
          </View>
          <View style={styles.doorSwingPanel}>
            <View style={styles.doorSwingInset} pointerEvents="none" />
          </View>
        </View>
        <View style={styles.stairsArea}>
          <Text style={[styles.stairsText, { color: LINE }]}>Stairs</Text>
          <View style={styles.stairsDiagram} pointerEvents="none">
            <View style={styles.stairsLanding} />
            <View style={styles.stairsRisers}>
              {Array.from({ length: 11 }).map((_, i) => (
                <View key={i} style={[styles.stairsRiser, { left: i * 14 }]} />
              ))}
            </View>
            <View style={styles.stairsArrowTop}>
              <View style={styles.stairsArrowLine} />
              <FontAwesome name="long-arrow-right" size={16} color={INK} style={styles.stairsArrowHeadTop} />
            </View>
            <View style={styles.stairsArrowBottom}>
              <FontAwesome name="long-arrow-left" size={16} color={INK} style={styles.stairsArrowHeadBottom} />
              <View style={styles.stairsArrowLine} />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

function RowsBenchBlock({
  spec,
  occupiedSeatIds,
  blockedSeatIds,
  selectedSeatId,
  onSelectSeat,
  interactive,
  layoutSet,
  onBottomBenchLayout,
}: {
  spec: RowsSeatBlockSpec;
  occupiedSeatIds: ReadonlySet<number>;
  blockedSeatIds: ReadonlySet<number>;
  selectedSeatId: number | null;
  onSelectSeat?: (n: number) => void;
  interactive: boolean;
  layoutSet: ReadonlySet<number>;
  /** Row 1 (bottom tier) publishes layout for door marker */
  onBottomBenchLayout?: (geom: { left: number; top: number; w: number; h: number }) => void;
}) {
  const count = Math.min(spec.topRow.length, spec.bottomRow.length);
  const [splitY, setSplitY] = useState<number | null>(null);

  return (
    <View
      style={[styles.benchIsland, spec.rowIndex === 1 ? styles.wrapRowBottom : null]}
      collapsable={false}
      onLayout={
        spec.rowIndex === 1 && onBottomBenchLayout
          ? (e) => {
              const { x, y, width, height } = e.nativeEvent.layout;
              onBottomBenchLayout({ left: x, top: y, w: width, h: height });
            }
          : undefined
      }
    >
      <Text style={styles.rowBenchLabel} pointerEvents="none" numberOfLines={1}>
        {spec.title}
      </Text>
      <View style={styles.seatRow} collapsable={false}>
        {splitY != null ? (
          <View pointerEvents="none" style={[styles.benchSplitLine, { top: splitY - 1 }]} />
        ) : null}
        {Array.from({ length: count }).map((_, i) => (
          <RowsSeatBay
            key={`${spec.rowIndex}-${spec.topRow[i]}-${spec.bottomRow[i]}`}
            topSeatNo={spec.topRow[i]}
            bottomSeatNo={spec.bottomRow[i]}
            occupiedSeatIds={occupiedSeatIds}
            blockedSeatIds={blockedSeatIds}
            selectedSeatId={selectedSeatId}
            onSelectSeat={onSelectSeat}
            interactive={interactive}
            layoutSet={layoutSet}
            showPartition={i < count - 1}
            onMeasureSplitY={i === 0 ? setSplitY : undefined}
          />
        ))}
      </View>
    </View>
  );
}

function RowsSeatBay({
  topSeatNo,
  bottomSeatNo,
  showPartition,
  occupiedSeatIds,
  blockedSeatIds,
  selectedSeatId,
  onSelectSeat,
  interactive,
  layoutSet,
  onMeasureSplitY,
}: {
  topSeatNo: number;
  bottomSeatNo: number;
  showPartition: boolean;
  occupiedSeatIds: ReadonlySet<number>;
  blockedSeatIds: ReadonlySet<number>;
  selectedSeatId: number | null;
  onSelectSeat?: (n: number) => void;
  interactive: boolean;
  layoutSet: ReadonlySet<number>;
  onMeasureSplitY?: (y: number) => void;
}) {
  const [splitMeasure, setSplitMeasure] = useState({
    seatCellTopInSeatRow: null as number | null,
    deskStackTopInCell: null as number | null,
    upperDeskBottomInDeskStack: null as number | null,
    lowerDeskTopInDeskStack: null as number | null,
  });

  const splitPublishedRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (!onMeasureSplitY) return;
    const seatCellTopInSeatRow = splitMeasure.seatCellTopInSeatRow;
    const deskStackTopInCell = splitMeasure.deskStackTopInCell;
    const upperDeskBottomInDeskStack = splitMeasure.upperDeskBottomInDeskStack;
    const lowerDeskTopInDeskStack = splitMeasure.lowerDeskTopInDeskStack;

    if (
      seatCellTopInSeatRow == null ||
      deskStackTopInCell == null ||
      upperDeskBottomInDeskStack == null ||
      lowerDeskTopInDeskStack == null
    ) {
      return;
    }

    const gapMidDeskStack = (upperDeskBottomInDeskStack + lowerDeskTopInDeskStack) / 2;
    const y = seatCellTopInSeatRow + deskStackTopInCell + gapMidDeskStack;
    if (!Number.isFinite(y)) return;
    if (splitPublishedRef.current === y) return;
    splitPublishedRef.current = y;
    onMeasureSplitY(y);
  }, [
    onMeasureSplitY,
    splitMeasure.seatCellTopInSeatRow,
    splitMeasure.deskStackTopInCell,
    splitMeasure.upperDeskBottomInDeskStack,
    splitMeasure.lowerDeskTopInDeskStack,
  ]);

  const topBook = layoutSet.has(topSeatNo) && occupiedSeatIds.has(topSeatNo);
  const bottomBook = layoutSet.has(bottomSeatNo) && occupiedSeatIds.has(bottomSeatNo);
  const topBlocked = layoutSet.has(topSeatNo) && blockedSeatIds.has(topSeatNo);
  const bottomBlocked = layoutSet.has(bottomSeatNo) && blockedSeatIds.has(bottomSeatNo);
  const topUnavailable = topBook || topBlocked;
  const bottomUnavailable = bottomBook || bottomBlocked;
  const topSel = layoutSet.has(topSeatNo) && selectedSeatId === topSeatNo && !topBlocked;
  const bottomSel = layoutSet.has(bottomSeatNo) && selectedSeatId === bottomSeatNo && !bottomBlocked;

  function deskSeatNoStyle(blocked: boolean, booked: boolean, selected: boolean) {
    if (blocked) return styles.deskSeatNoBlocked;
    if (booked) return styles.deskSeatNoBooked;
    if (selected) return styles.deskSeatNoSelected;
    return styles.deskSeatNoIdle;
  }

  function deskStyle(opts: { blocked: boolean; booked: boolean; selected: boolean }) {
    if (opts.blocked) return [styles.tableTop, styles.tableTopBlocked];
    if (opts.booked) return [styles.tableTop, styles.tableTopBooked];
    if (opts.selected) return [styles.tableTop, styles.tableTopSelected];
    return [styles.tableTop, styles.tableTopIdle];
  }

  function chairIconFixed(
    rotateDeg: string,
    opts: { selected: boolean; booked: boolean; blocked: boolean },
  ) {
    let color = AVAILABLE_CHAIR;
    if (opts.blocked) color = BLOCKED_CHAIR;
    else if (opts.booked) color = OCCUPIED_CHAIR;
    else if (opts.selected) color = SELECTED_CHAIR;

    return (
      <MaterialCommunityIcons
        name="chair-rolling"
        size={16}
        color={color}
        style={[{ transform: [{ rotate: rotateDeg }] }, opts.blocked ? styles.bookedOpacity : null]}
      />
    );
  }

  function seatPress(seatNo: number, unavailable: boolean, child: React.ReactNode) {
    if (!interactive || unavailable) {
      return <View style={styles.chairPress}>{child}</View>;
    }
    return (
      <Pressable
        style={({ pressed }) => [styles.chairPress, pressed && styles.pressed]}
        onPress={() => onSelectSeat?.(seatNo)}
        accessibilityRole="button"
        accessibilityLabel={`Seat ${seatNo}`}
      >
        {child}
      </Pressable>
    );
  }

  function deskPress(
    seatNo: number,
    unavailable: boolean,
    child: React.ReactNode,
    measureDesk?: 'upper' | 'lower',
  ) {
    const onDeskLayout =
      measureDesk != null && onMeasureSplitY
        ? (e: LayoutChangeEvent) => {
            const { y, height } = e.nativeEvent.layout;
            if (measureDesk === 'upper') {
              const bottom = y + height;
              setSplitMeasure((prev) =>
                prev.upperDeskBottomInDeskStack === bottom ? prev : { ...prev, upperDeskBottomInDeskStack: bottom },
              );
            } else {
              setSplitMeasure((prev) =>
                prev.lowerDeskTopInDeskStack === y ? prev : { ...prev, lowerDeskTopInDeskStack: y },
              );
            }
          }
        : undefined;

    if (!interactive || unavailable) {
      return (
        <View style={styles.chairPress} collapsable={false} onLayout={onDeskLayout}>
          {child}
        </View>
      );
    }

    return (
      <Pressable
        style={({ pressed }) => [styles.chairPress, pressed && styles.pressed]}
        onPress={() => onSelectSeat?.(seatNo)}
        accessibilityRole="button"
        accessibilityLabel={`Seat ${seatNo}`}
        onLayout={onDeskLayout}
      >
        {child}
      </Pressable>
    );
  }

  return (
    <View
      style={[styles.seatCell, showPartition ? styles.partitionRight : null]}
      collapsable={false}
      onLayout={(e) => {
        if (!onMeasureSplitY) return;
        const top = e.nativeEvent.layout.y;
        setSplitMeasure((prev) => (prev.seatCellTopInSeatRow === top ? prev : { ...prev, seatCellTopInSeatRow: top }));
      }}
    >
      {seatPress(
        topSeatNo,
        topUnavailable,
        <View style={styles.chairWrap}>
          {chairIconFixed('0deg', { selected: topSel, booked: topBook && !topBlocked, blocked: topBlocked })}
        </View>,
      )}

      <View
        style={styles.deskStack}
        collapsable={false}
        onLayout={(e) => {
          if (!onMeasureSplitY) return;
          const top = e.nativeEvent.layout.y;
          setSplitMeasure((prev) => (prev.deskStackTopInCell === top ? prev : { ...prev, deskStackTopInCell: top }));
        }}
      >
        {deskPress(
          topSeatNo,
          topUnavailable,
          <View style={deskStyle({ blocked: topBlocked, booked: topBook && !topBlocked, selected: topSel })}>
            {topBlocked ? (
              <View style={styles.deskBlockedCross} pointerEvents="none">
                <MaterialCommunityIcons name="close-thick" size={14} color="#B91C1C" />
              </View>
            ) : null}
            <View style={styles.deskSeatNoWrap} pointerEvents="none">
              <Text style={[styles.deskSeatNo, deskSeatNoStyle(topBlocked, topBook && !topBlocked, topSel)]}>{topSeatNo}</Text>
            </View>
          </View>,
          onMeasureSplitY ? 'upper' : undefined,
        )}
        {deskPress(
          bottomSeatNo,
          bottomUnavailable,
          <View
            style={deskStyle({ blocked: bottomBlocked, booked: bottomBook && !bottomBlocked, selected: bottomSel })}
          >
            {bottomBlocked ? (
              <View style={styles.deskBlockedCross} pointerEvents="none">
                <MaterialCommunityIcons name="close-thick" size={14} color="#B91C1C" />
              </View>
            ) : null}
            <View style={styles.deskSeatNoWrap} pointerEvents="none">
              <Text style={[styles.deskSeatNo, deskSeatNoStyle(bottomBlocked, bottomBook && !bottomBlocked, bottomSel)]}>
                {bottomSeatNo}
              </Text>
            </View>
          </View>,
          onMeasureSplitY ? 'lower' : undefined,
        )}
      </View>

      {seatPress(
        bottomSeatNo,
        bottomUnavailable,
        <View style={styles.chairWrap}>
          {chairIconFixed('180deg', {
            selected: bottomSel,
            booked: bottomBook && !bottomBlocked,
            blocked: bottomBlocked,
          })}
        </View>,
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  horizontalPad: { paddingVertical: 4, paddingBottom: 12 },
  room: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'visible',
    alignSelf: 'flex-start',
    backgroundColor: SURFACE,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  topWall: {
    height: 26,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17, 24, 39, 0.08)',
  },
  equipLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  middleBand: { flexDirection: 'row', alignItems: 'stretch' },
  leftWallStripe: {
    width: 36,
    borderRightWidth: 1,
    alignItems: 'center',
    paddingVertical: 8,
    position: 'relative',
  },
  wallEquipAcMid: { position: 'absolute', top: '50%', marginTop: -14, alignItems: 'center' },
  wallEquipWc: { position: 'absolute', alignItems: 'center', width: '100%' },
  wcBox: {
    borderWidth: 1,
    borderColor: 'rgba(31, 122, 77, 0.35)',
    backgroundColor: 'rgba(31, 122, 77, 0.06)',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 6,
    alignItems: 'center',
    minWidth: 28,
  },
  floor: { flexShrink: 0 },
  floorInner: {
    paddingTop: FLOOR_INNER_PADDING_TOP,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
    position: 'relative',
  },
  metaRow: { paddingHorizontal: 12, marginBottom: 8, gap: 2 },
  metaText: { fontSize: 11, fontWeight: '800' },
  columnsRow: { flexDirection: 'row', alignItems: 'stretch' },
  columnsRowAboveStairs: { marginBottom: STAIRS_TOP_CLEARANCE },
  /** Left column holds short-term benches (mirrors blueprint left stacks). */
  blockColumn: { flexShrink: 0 },
  rowsLeftBlockColumn: { alignSelf: 'flex-start', maxWidth: '100%' },
  /** Corridor toward window/stairs — same width as blueprint center aisle (34). */
  verticalAisle: { width: 34, alignSelf: 'stretch' },
  /** Mirrors long-term right column + walk gap beside stairs box. */
  rowsRightWalkColumn: {
    flex: 1,
    minWidth: 120,
    alignSelf: 'stretch',
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },
  rowsRightWalkSpacer: { flexGrow: 1, flexShrink: 1 },
  walkGapUnderLowerRightDesk: { height: 36 },
  rowsVerticalStack: { alignSelf: 'flex-start' },
  horizontalAisle: { height: 28, alignSelf: 'stretch' },
  rowTightGap: { height: 16 },
  benchIsland: { alignSelf: 'flex-start' },
  /** Row 1 is narrower (13 bays) — pin to the right so desks line up under Row 2 / Row 3. */
  wrapRowBottom: { alignSelf: 'flex-end' },
  rowBenchLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.35,
    color: 'rgba(17,24,39,0.48)',
    marginBottom: 6,
    paddingHorizontal: 14,
  },
  seatRow: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(17, 24, 39, 0.22)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginHorizontal: 0,
  },
  benchSplitLine: {
    position: 'absolute',
    left: 12,
    right: 12,
    height: 2,
    borderRadius: 2,
    backgroundColor: 'rgba(17, 24, 39, 0.22)',
    zIndex: 1,
  },
  windowStripeAbs: {
    position: 'absolute',
    top: 8,
    bottom: 40,
    right: -28,
    width: 28,
    alignItems: 'stretch',
    zIndex: 2,
  },
  windowFrame: {
    flex: 1,
    width: '100%',
    borderWidth: 2,
    borderColor: LINE,
    borderRadius: 8,
    backgroundColor: '#EDF1F8',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: -1, height: 0 },
    elevation: 1,
  },
  windowLintel: {
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(17, 24, 39, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
  },
  windowGrid: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 120,
  },
  windowCol: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: 'rgba(17, 24, 39, 0.18)',
  },
  windowColLast: { borderRightWidth: 0 },
  windowPane: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17, 24, 39, 0.14)',
  },
  windowPaneLast: {
    borderBottomWidth: 0,
  },
  windowSill: {
    height: 5,
    backgroundColor: 'rgba(252, 252, 255, 0.98)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(17, 24, 39, 0.12)',
  },
  doorSideLabelAbs: {
    position: 'absolute',
    right: 8,
    bottom: 14,
    transform: [{ rotate: '-90deg' }],
    flexDirection: 'column',
    alignItems: 'center',
    zIndex: 5,
    opacity: 0.95,
  },
  doorOpeningAbs: { position: 'absolute', width: 54, height: 22 },
  doorJambDown: {
    position: 'absolute',
    bottom: 0,
    width: 2,
    height: 36,
    backgroundColor: LINE,
  },
  stairsAbs: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    paddingLeft: 10,
    paddingTop: 2,
    paddingBottom: 0,
  },
  doorGap: {
    position: 'absolute',
    left: 0,
    top: 10,
    width: 22,
    height: 8,
    backgroundColor: SURFACE,
  },
  doorLeafLine: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 2,
    height: 18,
    backgroundColor: LINE,
    borderRadius: 2,
  },
  bottomWall: {
    borderTopWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  bottomWallInner: { flexDirection: 'row', justifyContent: 'flex-end' },
  doorStairs: {
    minWidth: 352,
    minHeight: 168,
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderColor: 'rgba(17, 24, 39, 0.18)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 8,
    marginTop: 0,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  doorStairsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    flex: 1,
    minHeight: 0,
  },
  doorLane: {
    width: 48,
    marginRight: 10,
    alignSelf: 'flex-start',
    alignItems: 'center',
  },
  doorUpperWall: {
    width: '100%',
    minHeight: 28,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(17, 24, 39, 0.28)',
  },
  doorSwingPanel: {
    width: 34,
    marginTop: 6,
    height: 90,
    borderWidth: 2,
    borderColor: LINE,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  doorSwingInset: {
    margin: 4,
    flex: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(17, 24, 39, 0.12)',
    backgroundColor: 'rgba(248, 250, 252, 0.95)',
  },
  stairsLeftJoin: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 10,
    backgroundColor: 'rgba(17, 24, 39, 0.32)',
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  stairsArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 4,
    minWidth: 246,
    flexShrink: 0,
  },
  stairsText: { fontSize: 16, fontWeight: '900', letterSpacing: 0.25 },
  stairsDiagram: {
    marginTop: 0,
    alignSelf: 'stretch',
    flex: 1,
    minHeight: 98,
    position: 'relative',
  },
  stairsLanding: {
    position: 'absolute',
    right: 8,
    top: '45%',
    width: 200,
    height: 6,
    borderRadius: 6,
    backgroundColor: INK,
    opacity: 0.85,
  },
  stairsRisers: {
    position: 'absolute',
    right: 8,
    top: 0,
    bottom: 0,
    width: 168,
  },
  stairsRiser: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(17, 24, 39, 0.28)',
  },
  stairsArrowTop: {
    position: 'absolute',
    left: 12,
    right: 14,
    top: 0,
    height: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  stairsArrowBottom: {
    position: 'absolute',
    left: 12,
    right: 14,
    bottom: 0,
    height: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  stairsArrowLine: {
    height: 3,
    flex: 1,
    maxWidth: 172,
    minWidth: 120,
    backgroundColor: INK,
    borderRadius: 3,
    opacity: 0.85,
  },
  stairsArrowHeadTop: { marginLeft: 10 },
  stairsArrowHeadBottom: { marginRight: 10 },
  legend: {
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
    maxWidth: 560,
    alignSelf: 'center',
    width: '100%',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendSwatch: {
    width: 22,
    height: 22,
    borderRadius: 5,
  },
  legendSwatchAvailable: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: SEAT_AVAILABLE_BORDER,
  },
  legendSwatchOccupied: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: SEAT_OCCUPIED_BORDER,
  },
  legendSwatchSelected: {
    backgroundColor: SEAT_SELECTED_FILL,
    borderWidth: 1,
    borderColor: SEAT_SELECTED_BORDER,
  },
  legendSwatchBlocked: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(185, 28, 28, 0.55)',
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendText: { fontSize: 13, fontWeight: '600' },
  seatCell: {
    flex: 1,
    minWidth: 26,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 3,
  },
  partitionRight: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(17, 24, 39, 0.18)',
  },
  chairPress: { alignItems: 'center', justifyContent: 'center' },
  chairWrap: { width: 20, height: 18, alignItems: 'center', justifyContent: 'center' },
  bookedOpacity: { opacity: 0.5 },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.92 },
  deskStack: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: DESK_GAP,
    marginVertical: 4,
  },
  tableTop: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  deskSeatNoWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deskSeatNo: {
    textAlign: 'center',
    fontSize: 8,
    fontWeight: '900',
    includeFontPadding: false,
  },
  deskSeatNoIdle: { color: '#0369A1' },
  deskSeatNoBooked: { color: '#B45309' },
  deskSeatNoSelected: { color: '#FFFFFF' },
  deskSeatNoBlocked: { color: '#991B1B', fontSize: 7 },
  tableTopIdle: {
    backgroundColor: SEAT_AVAILABLE_DESK_FILL,
    borderColor: SEAT_AVAILABLE_BORDER,
    borderWidth: 1,
  },
  tableTopBooked: {
    backgroundColor: SEAT_OCCUPIED_DESK_FILL,
    borderWidth: 2,
    borderColor: SEAT_OCCUPIED_BORDER,
  },
  tableTopSelected: {
    backgroundColor: SEAT_SELECTED_DESK_FILL,
    borderColor: SEAT_SELECTED_DESK_BORDER,
    borderWidth: 2,
  },
  tableTopBlocked: {
    backgroundColor: 'rgba(248, 113, 113, 0.16)',
    borderColor: 'rgba(185, 28, 28, 0.5)',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  deskBlockedCross: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.34)',
    borderRadius: 3,
  },
});

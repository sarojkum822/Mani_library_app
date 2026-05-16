import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { LayoutChangeEvent, TextStyle, ViewStyle } from 'react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import {
  LEFT_SEAT_BLOCKS,
  RIGHT_SEAT_BLOCKS,
  type SeatBlockSpec,
} from '@/lib/librarySeatLayout';

// Modern, clean palette (still blueprint-inspired).
const INK = '#111827';
const LINE = 'rgba(17, 24, 39, 0.72)';
const SOFT_LINE = 'rgba(17, 24, 39, 0.18)';
const SURFACE = '#FFFFFF';
const FLOOR = '#F7F7FB';
const AISLE = 'transparent';
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
/** Permanently blocked (not selectable) — desk shows a cross overlay. */
export const DEFAULT_BLOCKED_SEAT_IDS: ReadonlySet<number> = new Set([9, 56, 60, 61]);
const STROKE = 2;
const STROKE_SOFT = 1;

/** Inline so `ScrollView.contentContainerStyle` stays `ViewStyle` (avoids StyleSheet widen). */
const styles_scrollContentPadding: ViewStyle = { paddingRight: 36 };

/** Text-only styles kept separate so `Text` never receives `ViewStyle` unions from `StyleSheet.create`. */
const textStyles: { windowSide: TextStyle } = {
  windowSide: {
    marginTop: 4,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.35,
    textAlign: 'center',
  },
};

export type LibrarySeatMapProps = {
  occupiedSeatIds?: ReadonlySet<number>;
  /** Seats that cannot be chosen (shown with ✕ on desk). Defaults to `{9,56,60,61}`. Pass `new Set()` to clear. */
  blockedSeatIds?: ReadonlySet<number>;
  selectedSeatId?: number | null;
  onSelectSeat?: (seatNo: number) => void;
  interactive?: boolean;
};

export function LibrarySeatMap({
  occupiedSeatIds = new Set(),
  blockedSeatIds = DEFAULT_BLOCKED_SEAT_IDS,
  selectedSeatId = null,
  onSelectSeat,
  interactive = true,
}: LibrarySeatMapProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  const [leftBlockFrames, setLeftBlockFrames] = useState<Record<string, { x: number; y: number; w: number; h: number }>>({});

  const wcTop = useMemo(() => {
    /** WC on left wall aligned with bottom (BL 1–12) desk tier — visually “near” lower desks. */
    const bl = leftBlockFrames.bl;
    if (!bl) return undefined;
    const wcH = 28;
    return bl.y + bl.h / 2 - wcH / 2 + 10;
  }, [leftBlockFrames]);

  const doorMarkerPos = useMemo(() => {
    const bl = leftBlockFrames.bl;
    if (!bl) return undefined;
    // Place the opening right next to the bottom-left desk, toward the bottom wall.
    return {
      left: bl.x + bl.w,
      top: bl.y + bl.h + 2,
    };
  }, [leftBlockFrames]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles_scrollContentPadding}
    >
      <View style={styles.horizontalPad}>
        <View style={[styles.room, { borderColor: LINE }]}>
          <View style={styles.topWall}>
            <View style={styles.topWallAc}>
              <MaterialCommunityIcons name="air-conditioner" size={11} color={c.ink500} />
              <Text style={[styles.equipLabel, { color: c.ink400, marginTop: 2 }]}>AC</Text>
            </View>
          </View>

          <View style={styles.middleBand}>
            <View style={styles.leftWallStripe}>
              <View style={styles.wallEquipAcMid}>
                <MaterialCommunityIcons name="air-conditioner" size={11} color={c.ink500} />
                <Text style={[styles.equipLabel, { color: c.ink400, marginTop: 2 }]}>AC</Text>
              </View>
              <View style={[styles.wallEquipWc, wcTop != null ? { top: wcTop } : { top: '76%' }]}>
                <View style={styles.wcBox}>
                  <MaterialCommunityIcons name="toilet" size={11} color="#1F7A4D" />
                  <Text style={[styles.equipLabel, { color: '#1F7A4D', marginTop: 2 }]}>WC</Text>
                </View>
              </View>
            </View>

            <View style={[styles.floor, { backgroundColor: FLOOR }]}>
              <View style={styles.floorInner}>
                <View pointerEvents="none" style={styles.guidesLayer}>
                  <View style={styles.guideVertical} />
                  <View style={[styles.guideHorizontal, { top: 92 }]} />
                  <View style={[styles.guideHorizontal, { top: 198 }]} />
                  <View style={[styles.guideHorizontal, { top: 302 }]} />

                  {/* Arrowheads to match blueprint diagram */}
                  <FontAwesome name="long-arrow-up" size={14} color={SOFT_LINE} style={styles.guideArrowUp} />
                  <FontAwesome name="long-arrow-down" size={14} color={SOFT_LINE} style={styles.guideArrowDown} />
                  <FontAwesome name="long-arrow-right" size={14} color={SOFT_LINE} style={[styles.guideArrowRight, { top: 92 - 7 }]} />
                  <FontAwesome name="long-arrow-left" size={14} color={SOFT_LINE} style={[styles.guideArrowLeft, { top: 92 - 7 }]} />
                  <FontAwesome name="long-arrow-right" size={14} color={SOFT_LINE} style={[styles.guideArrowRight, { top: 198 - 7 }]} />
                  <FontAwesome name="long-arrow-left" size={14} color={SOFT_LINE} style={[styles.guideArrowLeft, { top: 198 - 7 }]} />
                  <FontAwesome name="long-arrow-right" size={14} color={SOFT_LINE} style={[styles.guideArrowRight, { top: 302 - 7 }]} />
                  <FontAwesome name="long-arrow-left" size={14} color={SOFT_LINE} style={[styles.guideArrowLeft, { top: 302 - 7 }]} />
                </View>
                <View style={styles.columnsRow}>
                  <View style={styles.blockColumn}>
                    {LEFT_SEAT_BLOCKS.map((block, idx) => (
                      <React.Fragment key={block.id}>
                        {idx > 0 ? <View style={[styles.horizontalAisle, { backgroundColor: AISLE }]} /> : null}
                        <View
                          style={block.id === 'bl' ? styles.leftBottomFlushToDoorWall : null}
                          collapsable={false}
                          onLayout={(e) => {
                            const { x, y, width, height } = e.nativeEvent.layout;
                            setLeftBlockFrames((prev) => ({
                              ...prev,
                              [block.id]: { x, y, w: width, h: height },
                            }));
                          }}
                        >
                          <SeatBlockDual
                            spec={block}
                            occupiedSeatIds={occupiedSeatIds}
                            blockedSeatIds={blockedSeatIds}
                            selectedSeatId={selectedSeatId}
                            onSelectSeat={onSelectSeat}
                            interactive={interactive}
                          />
                        </View>
                      </React.Fragment>
                    ))}
                  </View>

                  <View style={[styles.verticalAisle, { backgroundColor: AISLE }]} />

                  <View style={styles.blockColumn}>
                    {RIGHT_SEAT_BLOCKS.map((block, idx) => (
                      <React.Fragment key={block.id}>
                        {idx > 0 ? <View style={[styles.horizontalAisle, { backgroundColor: AISLE }]} /> : null}
                        <View style={idx > 0 ? styles.rightBlockFlushToWall : null}>
                          <SeatBlockDual
                            spec={block}
                            occupiedSeatIds={occupiedSeatIds}
                            blockedSeatIds={blockedSeatIds}
                            selectedSeatId={selectedSeatId}
                            onSelectSeat={onSelectSeat}
                            interactive={interactive}
                          />
                        </View>
                      </React.Fragment>
                    ))}
                    {/* Walk space between lower-right desk and stairs box */}
                    <View style={styles.walkGapUnderLowerRightDesk} />
                  </View>
                </View>

                {/* Window side wall (outside seat hit area). */}
                <WindowSideStrip
                  glassTint="rgba(96, 165, 250, 0.38)"
                  labelColor={c.ink600}
                />

                {/* Door label on right-side wall (bottom-right), vertical */}
                <View pointerEvents="none" style={styles.doorSideLabelAbs}>
                  <MaterialCommunityIcons name="door-open" size={14} color={LINE} />
                  <Text style={[styles.equipLabel, { color: LINE, marginTop: 4 }]}>Door</Text>
                </View>

                {/* Door opening marker: left edge anchored to bottom-left desk */}
                {doorMarkerPos ? (
                  <View
                    pointerEvents="none"
                    style={[styles.doorOpeningAbs, { left: doorMarkerPos.left, top: doorMarkerPos.top }]}
                  >
                    <View style={styles.doorGap} />
                    <View style={styles.doorLeafLine} />
                  </View>
                ) : null}

                {/* Door jamb line down to bottom wall (sticks to left desk edge) */}
                {doorMarkerPos ? (
                  <View
                    pointerEvents="none"
                    style={[styles.doorJambDown, { left: doorMarkerPos.left }]}
                  />
                ) : null}

                {/* Stairs zone: western edge aligns with bottom-left desks’ east side (same x as door jamb). */}
                {doorMarkerPos ? (
                  <View
                    pointerEvents="none"
                    style={[styles.stairsAbs, { left: doorMarkerPos.left }]}
                  >
                    <DoorAndStairs inkMuted={c.ink500} inkStrong={c.ink900} />
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          <View style={styles.bottomWall}>
            <View style={styles.bottomWallInner}>
              {/* Door label moved to right-side wall (see doorSideLabelAbs). */}
            </View>
          </View>
        </View>

        <View style={[styles.legend, { backgroundColor: c.surface, borderColor: c.border }]}>
          <LegendSeatItem label="Available" variant="available" textColor={c.ink700} />
          <LegendSeatItem label="Occupied" variant="occupied" textColor={c.ink700} />
          <LegendSeatItem label="Selected" variant="selected" textColor={c.ink700} />
        </View>
      </View>
    </ScrollView>
  );
}

/** Window-side façade (non-interactive). */
function WindowSideStrip({ glassTint, labelColor }: { glassTint: string; labelColor: string }) {
  const rows = 5;
  const cols = 2;
  return (
    <View pointerEvents="none" style={styles.windowStripeAbs}>
      <View style={styles.windowFrame}>
        <View style={styles.windowLintel}>
          <MaterialCommunityIcons name="window-closed-variant" size={12} color="rgba(17, 24, 39, 0.55)" />
          <Text style={[textStyles.windowSide, { color: labelColor }]} numberOfLines={2}>
            Window side
          </Text>
        </View>
        <View style={styles.windowGrid}>
          {Array.from({ length: cols }).map((_, c) => (
            <View key={c} style={[styles.windowCol, c === cols - 1 ? styles.windowColLast : null]}>
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

function LegendSeatItem({
  label,
  variant,
  textColor,
}: {
  label: string;
  variant: 'available' | 'occupied' | 'selected';
  textColor: string;
}) {
  return (
    <View style={styles.legendItem}>
      {variant === 'available' ? (
        <View style={[styles.legendSwatch, styles.legendSwatchAvailable]} />
      ) : variant === 'occupied' ? (
        <View style={[styles.legendSwatch, styles.legendSwatchOccupied]} />
      ) : (
        <View style={[styles.legendSwatch, styles.legendSwatchSelected]} />
      )}
      <Text style={[styles.legendText, { color: textColor }]}>{label}</Text>
    </View>
  );
}

function SeatBlockDual({
  spec,
  occupiedSeatIds,
  blockedSeatIds,
  selectedSeatId,
  onSelectSeat,
  interactive,
}: {
  spec: SeatBlockSpec;
  occupiedSeatIds: ReadonlySet<number>;
  blockedSeatIds: ReadonlySet<number>;
  selectedSeatId: number | null;
  onSelectSeat?: (n: number) => void;
  interactive: boolean;
}) {
  const count = Math.min(spec.topRow.length, spec.bottomRow.length);
  const [splitY, setSplitY] = useState<number | null>(null);

  return (
    <View style={[styles.benchIsland, spec.id === 'bl' ? styles.benchBottomFlush : null]}>
      <View style={styles.seatRow}>
        {/* Single divider across the whole desk block */}
        {splitY != null ? (
          <View pointerEvents="none" style={[styles.benchSplitLine, { top: splitY - 1 }]} />
        ) : null}
        {Array.from({ length: count }).map((_, i) => (
          <SeatBayDual
            key={`${spec.id}-${i}`}
            topSeatNo={spec.topRow[i]}
            bottomSeatNo={spec.bottomRow[i]}
            showPartition={i < count - 1}
            occupiedSeatIds={occupiedSeatIds}
            blockedSeatIds={blockedSeatIds}
            selectedSeatId={selectedSeatId}
            onSelectSeat={onSelectSeat}
            interactive={interactive}
            onMeasureSplitY={i === 0 ? (y: number) => setSplitY(y) : undefined}
          />
        ))}
      </View>
    </View>
  );
}

function SeatBayDual({
  topSeatNo,
  bottomSeatNo,
  showPartition,
  occupiedSeatIds,
  blockedSeatIds,
  selectedSeatId,
  onSelectSeat,
  interactive,
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
  onMeasureSplitY?: (y: number) => void;
}) {
  /**
   * Only the measuring bay publishes split-Y. Coordinate parts are merged from `onLayout` calls;
   * `useLayoutEffect` runs after commits so we're never missing `seatCell`/stack offsets (web-safe).
   */
  const [splitMeasure, setSplitMeasure] = useState({
    seatCellTopInSeatRow: null as number | null,
    deskStackTopInCell: null as number | null,
    upperDeskBottomInDeskStack: null as number | null,
    lowerDeskTopInDeskStack: null as number | null,
  });

  /** Avoid re-publishing identical Y (repeat `onLayout` + new object churn on web). */
  const splitPublishedRef = useRef<number | null>(null);

  const seatCellTopInSeatRow = splitMeasure.seatCellTopInSeatRow;
  const deskStackTopInCell = splitMeasure.deskStackTopInCell;
  const upperDeskBottomInDeskStack = splitMeasure.upperDeskBottomInDeskStack;
  const lowerDeskTopInDeskStack = splitMeasure.lowerDeskTopInDeskStack;

  useLayoutEffect(() => {
    if (!onMeasureSplitY) return;
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
    seatCellTopInSeatRow,
    deskStackTopInCell,
    upperDeskBottomInDeskStack,
    lowerDeskTopInDeskStack,
  ]);

  const topBooked = occupiedSeatIds.has(topSeatNo);
  const bottomBooked = occupiedSeatIds.has(bottomSeatNo);
  const topBlocked = blockedSeatIds.has(topSeatNo);
  const bottomBlocked = blockedSeatIds.has(bottomSeatNo);
  const topUnavailable = topBooked || topBlocked;
  const bottomUnavailable = bottomBooked || bottomBlocked;
  const topSelected = selectedSeatId === topSeatNo && !topBlocked;
  const bottomSelected = selectedSeatId === bottomSeatNo && !bottomBlocked;

  function deskSeatNoStyle(blocked: boolean, booked: boolean, selected: boolean) {
    if (blocked) return styles.deskSeatNoBlocked;
    if (booked) return styles.deskSeatNoBooked;
    if (selected) return styles.deskSeatNoSelected;
    return styles.deskSeatNoIdle;
  }

  function chairIcon(
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

  function seatPressable(seatNo: number, unavailable: boolean, child: React.ReactNode) {
    if (!interactive || unavailable) return <View style={styles.chairPress}>{child}</View>;
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

  /** Desk hit target: optional layout so split line uses the real gap between the two squares. */
  function deskSeatPressable(
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
      {/* Vertical stack: chair → desk → desk → chair (like your example) */}
      {seatPressable(
        topSeatNo,
        topUnavailable,
        <View style={styles.chairWrap}>
          {chairIcon('0deg', { selected: topSelected, booked: topBooked && !topBlocked, blocked: topBlocked })}
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
        {deskSeatPressable(
          topSeatNo,
          topUnavailable,
          <View
            style={[
              styles.tableTop,
              topBlocked
                ? styles.tableTopBlocked
                : topBooked
                  ? styles.tableTopBooked
                  : topSelected
                    ? styles.tableTopSelected
                    : styles.tableTopIdle,
            ]}
          >
            {topBlocked ? (
              <View style={styles.deskBlockedCross} pointerEvents="none">
                <MaterialCommunityIcons name="close-thick" size={15} color="#B91C1C" />
              </View>
            ) : null}
            <View style={styles.deskSeatNoWrap} pointerEvents="none">
              <Text style={[styles.deskSeatNo, deskSeatNoStyle(topBlocked, topBooked && !topBlocked, topSelected)]}>
                {topSeatNo}
              </Text>
            </View>
          </View>,
          onMeasureSplitY ? 'upper' : undefined,
        )}
        {deskSeatPressable(
          bottomSeatNo,
          bottomUnavailable,
          <View
            style={[
              styles.tableTop,
              bottomBlocked
                ? styles.tableTopBlocked
                : bottomBooked
                  ? styles.tableTopBooked
                  : bottomSelected
                    ? styles.tableTopSelected
                    : styles.tableTopIdle,
            ]}
          >
            {bottomBlocked ? (
              <View style={styles.deskBlockedCross} pointerEvents="none">
                <MaterialCommunityIcons name="close-thick" size={15} color="#B91C1C" />
              </View>
            ) : null}
            <View style={styles.deskSeatNoWrap} pointerEvents="none">
              <Text style={[styles.deskSeatNo, deskSeatNoStyle(bottomBlocked, bottomBooked && !bottomBlocked, bottomSelected)]}>
                {bottomSeatNo}
              </Text>
            </View>
          </View>,
          onMeasureSplitY ? 'lower' : undefined,
        )}
      </View>

      {seatPressable(
        bottomSeatNo,
        bottomUnavailable,
        <View style={styles.chairWrap}>
          {chairIcon('180deg', {
            selected: bottomSelected,
            booked: bottomBooked && !bottomBlocked,
            blocked: bottomBlocked,
          })}
        </View>,
      )}
    </View>
  );
}

function DoorAndStairs({ inkMuted, inkStrong }: { inkMuted: string; inkStrong: string }) {
  return (
    <View style={styles.doorStairs}>
      <View style={styles.stairsLeftJoin} pointerEvents="none" />
      <View style={styles.doorStairsRow}>
        <View style={styles.doorLane}>
          <View style={styles.doorUpperWall}>
            <Text style={[styles.equipLabel, { color: inkStrong }]}>Door</Text>
            <FontAwesome name="long-arrow-up" size={13} color={inkMuted} />
          </View>
          <View style={styles.doorSwingPanel}>
            <View style={styles.doorSwingInset} pointerEvents="none" />
          </View>
        </View>
        <View style={styles.stairsArea}>
          <Text style={[styles.stairsText, { color: inkStrong }]}>Stairs</Text>
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

const styles = StyleSheet.create({
  horizontalPad: { paddingVertical: 4, paddingBottom: 12 },
  room: {
    borderWidth: 1,
    borderRadius: 16,
    // Window graphic sits slightly outside the floor; clipping would hide it.
    overflow: 'visible',
    alignSelf: 'flex-start',
    backgroundColor: SURFACE,
    shadowColor: '#0f172a',
    shadowOpacity: 0.07,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  topWall: {
    height: 28,
    backgroundColor: '#F1F4F9',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(17, 24, 39, 0.12)',
  },
  topWallAc: { alignItems: 'center', justifyContent: 'center' },
  middleBand: { flexDirection: 'row', alignItems: 'stretch' },
  leftWallStripe: {
    width: 36,
    backgroundColor: '#F4F6FA',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(17, 24, 39, 0.14)',
    alignItems: 'center',
    paddingVertical: 8,
    position: 'relative',
  },
  wallEquipAcMid: { position: 'absolute', top: '50%', marginTop: -14, alignItems: 'center' },
  wallEquipWc: {
    position: 'absolute',
    // Dynamically aligned with bottom desk tier (`wcTop`); fallback `76%`.
    alignItems: 'center',
    width: '100%',
  },
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
  // Keep top breathing room, but let the bottom (1–12) desk touch the door-side wall.
  floorInner: { paddingTop: 16, paddingBottom: 0, paddingHorizontal: 0, position: 'relative' },
  guidesLayer: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, opacity: 0.55 },
  guideVertical: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    left: '50%',
    width: 1,
    borderLeftWidth: 1,
    borderLeftColor: SOFT_LINE,
    borderStyle: 'dashed',
  },
  guideHorizontal: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 1,
    borderTopWidth: 1,
    borderTopColor: SOFT_LINE,
    borderStyle: 'dashed',
  },
  guideArrowUp: { position: 'absolute', left: '50%', marginLeft: -6, top: 16 },
  guideArrowDown: { position: 'absolute', left: '50%', marginLeft: -6, bottom: 16 },
  guideArrowRight: { position: 'absolute', right: 14 },
  guideArrowLeft: { position: 'absolute', left: 14 },
  columnsRow: { flexDirection: 'row', alignItems: 'stretch' },
  blockColumn: { flexShrink: 0 },
  verticalAisle: { width: 34, alignSelf: 'stretch' },
  horizontalAisle: { height: 28, alignSelf: 'stretch' },
  /** Extra cushion above stairs so lower-right bays don’t crowd the egress strip (full‑day hall). */
  walkGapUnderLowerRightDesk: { height: 52 },
  windowStripeAbs: {
    position: 'absolute',
    top: 6,
    bottom: 38,
    right: -28,
    width: 28,
    alignItems: 'stretch',
    zIndex: 2,
  },
  windowFrame: {
    flex: 1,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(17, 24, 39, 0.28)',
    borderRadius: 10,
    backgroundColor: '#E2EAF4',
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: -2, height: 2 },
    elevation: 2,
  },
  windowLintel: {
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(17, 24, 39, 0.14)',
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
  },
  windowGrid: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 140,
  },
  windowCol: {
    flex: 1,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(17, 24, 39, 0.12)',
  },
  windowColLast: {
    borderRightWidth: 0,
  },
  windowPane: {
    flex: 1,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(17, 24, 39, 0.1)',
  },
  windowPaneLast: {
    borderBottomWidth: 0,
  },
  windowSill: {
    height: 7,
    backgroundColor: '#F8FAFC',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(17, 24, 39, 0.14)',
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
  bottomWall: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(17, 24, 39, 0.12)',
    backgroundColor: '#F1F4F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  bottomWallInner: { flexDirection: 'row', justifyContent: 'flex-end' },
  doorLabelRow: { flexDirection: 'row', alignItems: 'center' },
  doorOpeningAbs: { position: 'absolute', width: 54, height: 22, zIndex: 6 },
  doorJambDown: {
    position: 'absolute',
    bottom: 0,
    width: 2,
    height: 36,
    backgroundColor: LINE,
    zIndex: 6,
  },
  stairsAbs: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    zIndex: 1,
    paddingLeft: 6,
    paddingTop: 2,
    paddingBottom: 0,
  },
  doorGap: {
    position: 'absolute',
    left: 0,
    top: 10,
    width: 22,
    height: 8,
    backgroundColor: FLOOR,
  },
  doorLeafLine: {
    position: 'absolute',
    // Door leaf opens upward into the room
    left: 0,
    top: 0,
    width: 2,
    height: 18,
    backgroundColor: LINE,
    borderRadius: 2,
  },
  doorSwingArc: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 18,
    height: 18,
    borderWidth: 2,
    borderColor: LINE,
    // Quarter arc showing upward-opening swing
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRadius: 18,
    transform: [{ rotate: '90deg' }],
  },
  equipLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  benchIsland: { alignSelf: 'flex-start' },
  benchBottomFlush: { marginBottom: 0 },
  benchInsetFromWall: { marginLeft: 0 },
  // Bottom-left block ends at the door-side wall in the reference.
  leftBottomFlushToDoorWall: { alignSelf: 'flex-end' },
  // Only for right column middle + lower blocks (match reference: they touch window wall).
  rightBlockFlushToWall: { alignSelf: 'flex-end' },
  seatRow: {
    position: 'relative',
    flexDirection: 'row',
    // Stretch so each seat cell shares one row cross-size; avoids inconsistent `layout.y`
    // from vertical centering and fixes one split-line across bays (web/native).
    alignItems: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.85)',
    // Only vertical edges (no upper/lower line).
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(17, 24, 39, 0.22)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  benchSplitLine: {
    position: 'absolute',
    left: 12,
    right: 12,
    height: 2,
    borderRadius: 2,
    backgroundColor: 'rgba(17, 24, 39, 0.22)',
  },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.92 },
  // Symmetric padding so partition lines have equal space on both sides.
  seatCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  partitionRight: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(17, 24, 39, 0.18)',
  },
  chairPress: { alignItems: 'center', justifyContent: 'center' },
  chairWrap: { width: 20, height: 18, alignItems: 'center', justifyContent: 'center' },
  // Keep chair slightly tucked under the desk (opposite each other).
  bookedOpacity: { opacity: 0.5 },
  // Stretch so the mid divider can span the whole bay.
  deskStack: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
    marginVertical: 4,
  },
  tableTop: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    position: 'relative',
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
  // (seatStack styles no longer used; each bay is dual-sided)
  doorStairs: {
    width: '100%',
    minWidth: 352,
    minHeight: 138,
    borderWidth: 1,
    borderColor: 'rgba(17, 24, 39, 0.12)',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 8,
    marginTop: 0,
    backgroundColor: 'rgba(255,255,255,0.98)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
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
    minHeight: 24,
    paddingTop: 4,
    paddingBottom: 4,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(248, 250, 252, 0.95)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(17, 24, 39, 0.14)',
  },
  doorSwingPanel: {
    width: 34,
    marginTop: 5,
    height: 62,
    borderWidth: 1,
    borderColor: 'rgba(17, 24, 39, 0.35)',
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.99)',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  doorSwingInset: {
    margin: 3,
    flex: 1,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(17, 24, 39, 0.1)',
    backgroundColor: 'rgba(241, 245, 249, 0.98)',
  },
  stairsLeftJoin: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.22)',
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  stairsArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 4,
    minWidth: 246,
    flexShrink: 0,
  },
  stairsText: { fontSize: 14, fontWeight: '900', letterSpacing: 0.2 },
  stairsDiagram: {
    marginTop: 0,
    alignSelf: 'stretch',
    flex: 1,
    minHeight: 70,
    position: 'relative',
  },
  stairsLanding: {
    position: 'absolute',
    right: 8,
    top: '45%',
    width: 200,
    height: 5,
    borderRadius: 5,
    backgroundColor: 'rgba(17, 24, 39, 0.78)',
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
    backgroundColor: 'rgba(17, 24, 39, 0.2)',
    borderRadius: 1,
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
    backgroundColor: 'rgba(17, 24, 39, 0.72)',
    borderRadius: 3,
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
    gap: 16,
    maxWidth: 520,
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
  legendText: { fontSize: 13, fontWeight: '600' },
});

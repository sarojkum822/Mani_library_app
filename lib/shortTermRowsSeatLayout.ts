/**
 * Short-term 3-row hall layout (~6h rollout). 90 desks total; numbering matches the venue blueprint.
 */

export type RowsSeatBlockSpec = {
  rowIndex: 1 | 2 | 3;
  title: string;
  topRow: number[];
  bottomRow: number[];
};

function inclusiveRange(lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let n = lo; n <= hi; n += 1) out.push(n);
  return out;
}

/** Row 3: 16 + 16, Row 2: 16 + 16, Row 1: 13 + 13 = 90 seats. */
export const ROWS_SEAT_BLOCKS: RowsSeatBlockSpec[] = [
  {
    rowIndex: 3,
    title: 'Row 3 · seats 75–90 / 59–74',
    topRow: inclusiveRange(75, 90),
    bottomRow: inclusiveRange(59, 74),
  },
  {
    rowIndex: 2,
    title: 'Row 2 · seats 43–58 / 27–42',
    topRow: inclusiveRange(43, 58),
    bottomRow: inclusiveRange(27, 42),
  },
  {
    rowIndex: 1,
    title: 'Row 1 · seats 14–26 / 1–13',
    topRow: inclusiveRange(14, 26),
    bottomRow: inclusiveRange(1, 13),
  },
];

export const ALL_ROWS_LAYOUT_SEAT_NUMBERS: Readonly<number[]> = ROWS_SEAT_BLOCKS.flatMap((b) => [
  ...b.topRow,
  ...b.bottomRow,
]);

export const ROWS_LAYOUT_TOTAL_SEATS = ALL_ROWS_LAYOUT_SEAT_NUMBERS.length;

/** Seats that are not selectable in the short-term rows layout (shown with ✕), in addition to `DEFAULT_BLOCKED_SEAT_IDS` from `LibrarySeatMap`. */
export const ROWS_ADDITIONAL_BLOCKED_SEAT_IDS: ReadonlySet<number> = new Set([43, 46, 54]);

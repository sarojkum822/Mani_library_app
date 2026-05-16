/**
 * Floor layout for Mani Library — 100 seats in 7 back-to-back bench blocks.
 * Numbering matches the provided diagram (snake within each block).
 */

export type SeatBlockSpec = {
  id: string;
  /** Top row, left → right (faces toward top of room). */
  topRow: number[];
  /** Bottom row, left → right (faces toward bottom of room). */
  bottomRow: number[];
  /** Visual offset from wall (matches floor diagram). */
  insetFromWall?: boolean;
};

/** Left column, top → bottom (door is bottom-right of room). */
export const LEFT_SEAT_BLOCKS: SeatBlockSpec[] = [
  {
    id: 'tl',
    topRow: [100, 99, 98, 97, 96, 95, 94, 93],
    bottomRow: [69, 70, 71, 72, 73, 74, 75, 76],
  },
  {
    id: 'ml',
    topRow: [68, 67, 66, 65, 64, 63, 62],
    bottomRow: [41, 42, 43, 44, 45, 46, 47],
    insetFromWall: true,
  },
  {
    id: 'll',
    topRow: [40, 39, 38, 37, 36, 35, 34],
    bottomRow: [13, 14, 15, 16, 17, 18, 19],
    insetFromWall: true,
  },
  {
    id: 'bl',
    topRow: [12, 11, 10, 9, 8, 7],
    bottomRow: [1, 2, 3, 4, 5, 6],
  },
];

/** Right column, top → bottom. */
export const RIGHT_SEAT_BLOCKS: SeatBlockSpec[] = [
  {
    id: 'tr',
    topRow: [92, 91, 90, 89, 88, 87, 86, 85],
    bottomRow: [77, 78, 79, 80, 81, 82, 83, 84],
  },
  {
    id: 'mr',
    topRow: [61, 60, 59, 58, 57, 56, 55],
    bottomRow: [48, 49, 50, 51, 52, 53, 54],
  },
  {
    id: 'lr',
    topRow: [33, 32, 31, 30, 29, 28, 27],
    bottomRow: [20, 21, 22, 23, 24, 25, 26],
  },
];

export const ALL_SEAT_NUMBERS = (() => {
  const nums: number[] = [];
  function addBlock(b: SeatBlockSpec) {
    nums.push(...b.topRow, ...b.bottomRow);
  }
  LEFT_SEAT_BLOCKS.forEach(addBlock);
  RIGHT_SEAT_BLOCKS.forEach(addBlock);
  return nums.sort((a, b) => a - b);
})();

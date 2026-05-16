/**
 * Fallback when the seat screen is opened without a `planId` (dev / deep link).
 * Normal flow: layout comes from the plan — full day → Mani (F1–F100), half / hour → rows (S…).
 */
export type MembershipSeatLayoutMode = 'mani' | 'rows';

export const MEMBERSHIP_SEAT_LAYOUT_MODE: MembershipSeatLayoutMode = 'rows';

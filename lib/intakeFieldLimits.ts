/** Limits for profile intake fields (client + must match server). */

export const INTAKE_AADHAAR_LAST4_LEN = 4;
export const INTAKE_ROLL_MAX_DIGITS = 8;

export function sanitizeAadhaarLastFourInput(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, INTAKE_AADHAAR_LAST4_LEN);
}

/** Roll / member ID: numbers only, max length (reduces abuse of profile_extras). */
export function sanitizeRollNumberDigitsInput(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, INTAKE_ROLL_MAX_DIGITS);
}

/** Input limits — keep in sync with `manilibrary/src/lib/security/field-limits.ts`. */

export const FIELD_LIMITS = {
  nameMin: 2,
  nameMax: 100,
  emailMax: 254,
  phoneMax: 40,
  passwordMin: 8,
  passwordMax: 128,
} as const;

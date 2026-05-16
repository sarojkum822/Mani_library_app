/** Same values as the website `ProfileIntakeCard` / `PATCH /api/me/profile-intake`. */
export const MEMBERSHIP_INSTITUTION_OPTIONS: { value: string; label: string }[] = [
  { value: 'school', label: 'School' },
  { value: 'college', label: 'College' },
  { value: 'freelance', label: 'Freelance / self-study' },
  { value: 'other', label: 'Other' },
];

export const MEMBERSHIP_INSTITUTION_VALUES = new Set(MEMBERSHIP_INSTITUTION_OPTIONS.map((o) => o.value));

/**
 * Mani Library design tokens (mobile).
 * Mirrors `manilibrary/src/app/globals.css` token values.
 */

const brand = '#0160D0';

export default {
  light: {
    text: '#101828', // ink-900
    background: '#ffffff', // surface
    tint: brand,
    tabIconDefault: '#98A2B3', // ink-400
    tabIconSelected: brand,

    surface: '#ffffff',
    surfaceMuted: '#F7F9FC',
    surfaceSunken: '#F1F4F9',

    border: '#E1E6EE',
    borderStrong: '#C7CFDB',

    ink50: '#F7F9FC',
    ink100: '#EEF1F6',
    ink200: '#E1E6EE',
    ink300: '#C7CFDB',
    ink400: '#98A2B3',
    ink500: '#667085',
    ink600: '#475467',
    ink700: '#344054',
    ink800: '#1D2939',
    ink900: '#101828',

    azure50: '#E6F0FB',
    azure100: '#CCE1F7',
    azure200: '#99C3EF',
    azure300: '#66A6E7',
    azure400: '#3388DF',
    azure500: brand,
    azure600: '#014DA6',
    azure700: '#013A7D',
    azure800: '#002653',
    azure900: '#00132A',

    /** Membership status pills (mirrors web emerald / amber / red). */
    emerald100: '#D1FAE5',
    emerald800: '#065F46',
    amber100: '#FEF3C7',
    amber800: '#92400E',
    red100: '#FEE2E2',
    red700: '#B91C1C',
  },
  // We keep a usable dark palette, but the product is currently styled as light-first.
  dark: {
    text: '#F7F9FC',
    background: '#0B1220',
    tint: brand,
    tabIconDefault: '#98A2B3',
    tabIconSelected: brand,

    surface: '#0B1220',
    surfaceMuted: '#0F1A2E',
    surfaceSunken: '#0A1020',

    border: '#1D2939',
    borderStrong: '#344054',

    ink50: '#F7F9FC',
    ink100: '#EEF1F6',
    ink200: '#E1E6EE',
    ink300: '#C7CFDB',
    ink400: '#98A2B3',
    ink500: '#667085',
    ink600: '#475467',
    ink700: '#344054',
    ink800: '#1D2939',
    ink900: '#101828',

    azure50: '#E6F0FB',
    azure100: '#CCE1F7',
    azure200: '#99C3EF',
    azure300: '#66A6E7',
    azure400: '#3388DF',
    azure500: brand,
    azure600: '#014DA6',
    azure700: '#013A7D',
    azure800: '#002653',
    azure900: '#00132A',

    emerald100: '#D1FAE5',
    emerald800: '#065F46',
    amber100: '#FEF3C7',
    amber800: '#92400E',
    red100: '#FEE2E2',
    red700: '#B91C1C',
  },
};

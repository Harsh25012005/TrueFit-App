/**
 * Design tokens — copied from DESIGN.md (§2 colours, §3 type, §4 spacing/radius/motion).
 * This is the ONLY file in the app that may contain colour values.
 * Change DESIGN.md first, then this file; `tokens.test.ts` checks the two match.
 */

export type ColorScheme = 'light' | 'dark';

export const palette = {
  light: {
    primary: '#047D55',
    'primary-pressed': '#03664A',
    'primary-subtle': '#E6F3ED',
    'on-primary': '#FFFFFF',
    secondary: '#18181B',
    'on-secondary': '#FAFAFA',
    background: '#FAFAFA',
    surface: '#FFFFFF',
    'surface-muted': '#F5F5F6',
    border: '#E7E7EA',
    'border-subtle': '#F0F0F2',
    text: '#18181B',
    'text-muted': '#6B6B73',
    'text-faint': '#A1A1AA',
    success: '#047D55',
    warning: '#B45309',
    'warning-subtle': '#FEF3E2',
    error: '#C0392B',
    'on-error': '#FFFFFF',
    'error-subtle': '#FBEDEB',
    overlay: 'rgba(10,12,18,0.50)',
  },
  dark: {
    primary: '#3CCB94',
    'primary-pressed': '#62D9AA',
    'primary-subtle': '#112A20',
    'on-primary': '#06150F',
    secondary: '#EDEDF0',
    'on-secondary': '#0E0E10',
    background: '#0E0E10',
    surface: '#151518',
    'surface-muted': '#1B1B1F',
    border: '#26262B',
    'border-subtle': '#1E1E22',
    text: '#EDEDF0',
    'text-muted': '#9B9BA4',
    'text-faint': '#62626B',
    success: '#3CCB94',
    warning: '#F2B25C',
    'warning-subtle': '#2E2414',
    error: '#EF7D70',
    'on-error': '#0E0E10',
    'error-subtle': '#2E1A18',
    overlay: 'rgba(0,0,0,0.60)',
  },
} as const;

export type ColorToken = keyof (typeof palette)['light'];
export type Palette = Record<ColorToken, string>;

/** 4-pt spacing scale (DESIGN.md §4), in dp. */
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
} as const;

/** Layout constants used across screens (DESIGN.md §4, §6, §7). */
export const layout = {
  screenPadding: 16,
  cardPadding: 16,
  sectionGap: 28,
  cardGap: 8,
  touchMin: 48,
  rowMin: 56,
  tabBarSpace: 112,
} as const;

/** Radius (DESIGN.md §4): nothing rounder than 4. */
export const radius = {
  none: 0,
  sm: 2,
  md: 4,
} as const;

export type FontWeight = '400' | '500' | '600' | '700' | '800';

export interface TypeStyle {
  size: number;
  lineHeight: number;
  weight: FontWeight;
  letterSpacing?: number;
}

/** Type scale (DESIGN.md §3), in dp. */
export const typeScale = {
  display: { size: 30, lineHeight: 36, weight: '700' },
  'title-1': { size: 24, lineHeight: 30, weight: '700' },
  'title-2': { size: 20, lineHeight: 26, weight: '700' },
  'title-3': { size: 17, lineHeight: 24, weight: '600' },
  body: { size: 16, lineHeight: 24, weight: '400' },
  'body-strong': { size: 16, lineHeight: 24, weight: '600' },
  label: { size: 14, lineHeight: 20, weight: '500' },
  caption: { size: 13, lineHeight: 18, weight: '400' },
  overline: { size: 12, lineHeight: 16, weight: '600', letterSpacing: 0.96 },
} as const satisfies Record<string, TypeStyle>;

export type TypeToken = keyof typeof typeScale;

/** Gujarati/Hindi line height bonus (DESIGN.md §3). */
export const INDIC_LINE_HEIGHT_BONUS = 2;
/** In-app "Large text" multiplier (DESIGN.md §3). */
export const LARGE_TEXT_SCALE = 1.15;

/** Motion (DESIGN.md §4), in ms. */
export const motion = {
  fade: 180,
  sheet: 280,
  toast: 250,
  pressScale: 0.97,
  easing: [0.2, 0.8, 0.2, 1] as const,
} as const;

/** Breakpoints by window width (DESIGN.md §4). */
export const breakpoints = {
  tablet: 600,
  wide: 960,
} as const;

/** Icon sizes (DESIGN.md §5). */
export const iconSize = {
  sm: 16,
  md: 20,
  lg: 24,
} as const;

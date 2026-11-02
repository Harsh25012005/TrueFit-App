/**
 * Measurements are stored in INCHES with 2 decimals (DATABASE.md §1, numeric(6,2)); centimetres
 * exist only for input and display (PRD M6, FEATURES.md M6).
 */
export type Unit = 'in' | 'cm';

export const CM_PER_INCH = 2.54;
export const MIN_VALUE_IN = 0.25;
export const MAX_VALUE_IN = 999.99;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** What the owner typed (in the shop's unit) → inches to store, 2 decimals. */
export function toInches(value: number, unit: Unit): number {
  return round2(unit === 'cm' ? value / CM_PER_INCH : value);
}

/** Stored inches → value to show in the shop's unit (cm to 1 decimal, inches to 2). */
export function fromInches(inches: number, unit: Unit): number {
  return unit === 'cm' ? Math.round(inches * CM_PER_INCH * 10) / 10 : round2(inches);
}

/** "40.5" / "101.6" — no trailing zeros, dot decimal, Latin digits. */
export function formatMeasurement(inches: number, unit: Unit): string {
  return String(fromInches(inches, unit));
}

/** Parses typed text ("40,5" works) to a number, or null when it isn't one. */
export function parseNumber(text: string): number | null {
  const clean = text.trim().replace(',', '.');
  if (!clean || !/^\d*\.?\d+$|^\d+\.$/.test(clean)) return null;
  const n = Number(clean);
  return Number.isFinite(n) ? n : null;
}

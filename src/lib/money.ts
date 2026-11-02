/**
 * Money is whole rupees (DATABASE.md §1). Formatting uses Indian lakh grouping — ₹1,25,000 —
 * with Latin digits in every language (DESIGN.md §8.8). Done by hand because Hermes' Intl
 * support for en-IN grouping is not guaranteed on every Android build.
 */

/** "1250000" → "12,50,000": last three digits, then groups of two. */
export function groupIndian(digits: string): string {
  if (digits.length <= 3) return digits;
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${rest},${last3}`;
}

/** 125000 → "₹1,25,000"; negative amounts (refunds) → "−₹500". */
export function formatMoney(rupees: number): string {
  const whole = Math.round(Math.abs(rupees));
  const text = `₹${groupIndian(String(whole))}`;
  return rupees < 0 && whole > 0 ? `−${text}` : text;
}

/** Digits only (for amount inputs): "₹1,250" → 1250; empty → null. */
export function parseMoney(text: string): number | null {
  const digits = text.replace(/\D/g, '');
  return digits ? Number(digits) : null;
}

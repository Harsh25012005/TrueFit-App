/**
 * Dates are stored ISO (YYYY-MM-DD for dates, UTC for timestamps) and shown in Asia/Kolkata
 * (ARCHITECTURE.md §6). India has no daylight saving, so IST is a fixed UTC+5:30 — no Intl needed.
 */
const IST_OFFSET_MS = 330 * 60_000;

/** Today's date in India as YYYY-MM-DD (matches the server's shop_today()). */
export function todayInKolkata(now: Date = new Date()): string {
  return new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-11-02" → "2 Nov 2026" (Latin digits and month names in every language). */
export function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

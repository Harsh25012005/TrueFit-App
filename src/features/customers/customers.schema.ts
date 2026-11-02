import { z } from 'zod';

/** Same limits as DATABASE.md §2.6 and FEATURES.md M5. Messages are i18n keys. */
export const customerNameSchema = z
  .string()
  .trim()
  .normalize('NFC')
  .min(2, { message: 'customers.errors.name' })
  .max(50, { message: 'customers.errors.name' });

export const customerPhoneSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, { message: 'customers.errors.phone' });

export const bookNoSchema = z
  .string()
  .trim()
  .max(12, { message: 'customers.errors.bookNo' })
  .transform((v) => (v === '' ? null : v))
  .nullable();

export const areaSchema = z
  .string()
  .trim()
  .normalize('NFC')
  .max(100, { message: 'customers.errors.area' })
  .transform((v) => (v === '' ? null : v))
  .nullable();

/**
 * No `.default()` here: a partial update must leave omitted fields alone. The repo decides what
 * a missing book number or area means when creating (next number / none).
 */
export const customerInputSchema = z.object({
  name: customerNameSchema,
  phone: customerPhoneSchema,
  bookNo: bookNoSchema.optional(),
  area: areaSchema.optional(),
});
export type CustomerInput = z.input<typeof customerInputSchema>;

export const customerPatchSchema = customerInputSchema.partial();
export type CustomerPatch = z.input<typeof customerPatchSchema>;

/** Highest numeric book number + 1; non-numeric ones ("A-7") are ignored (TESTING.md C4). */
export function nextBookNo(existing: (string | null)[]): string {
  let max = 0;
  for (const b of existing) {
    if (b && /^\d{1,12}$/.test(b)) max = Math.max(max, Number(b));
  }
  return String(max + 1);
}

/** Search text → SQL LIKE pattern with wildcards escaped; null when there is nothing to search. */
export function likePattern(query: string): string | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

import { z } from 'zod';

import { MAX_VALUE_IN, MIN_VALUE_IN } from '@/lib/units';

/** FEATURES.md M6 / DATABASE.md §2.7–2.9. Values are INCHES, 2 decimals. Messages are i18n keys. */
export const MAX_VERSIONS = 10;
export const MAX_NOTES = 300;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** One measurement value in inches: 0.25 – 999.99 (TESTING.md ME1: 0 and 1000 are rejected). */
export const valueInSchema = z
  .number({ message: 'measurements.errors.value' })
  .min(MIN_VALUE_IN, { message: 'measurements.errors.value' })
  .max(MAX_VALUE_IN, { message: 'measurements.errors.value' })
  .transform(round2);

export const notesSchema = z
  .string()
  .trim()
  .normalize('NFC')
  .max(MAX_NOTES, { message: 'measurements.errors.notes' })
  .transform((v) => (v === '' ? null : v))
  .nullable();

export const saveMeasurementSchema = z.object({
  /** field id → inches. At least one field must be filled. */
  values: z
    .record(z.string().min(1), valueInSchema)
    .refine((v) => Object.keys(v).length > 0, { message: 'measurements.errors.noValues' }),
  notes: notesSchema.default(null),
});

export type SaveMeasurementInput = z.input<typeof saveMeasurementSchema>;

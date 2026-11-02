import { z } from 'zod';

/** Same limits as DATABASE.md §2.4/§2.5 and FEATURES.md M4. Messages are i18n keys. */
export const MAX_FIELDS_PER_GARMENT = 30;
export const MAX_FABRIC_M = 20;

export const garmentNameSchema = z
  .string()
  .trim()
  .normalize('NFC')
  .min(2, { message: 'garments.errors.garmentName' })
  .max(30, { message: 'garments.errors.garmentName' });

export const fieldNameSchema = z
  .string()
  .trim()
  .normalize('NFC')
  .min(1, { message: 'garments.errors.fieldName' })
  .max(30, { message: 'garments.errors.fieldName' });

export const fabricSchema = z
  .number({ message: 'garments.errors.fabric' })
  .min(0, { message: 'garments.errors.fabric' })
  .max(MAX_FABRIC_M, { message: 'garments.errors.fabric' })
  // numeric(4,1): one decimal place.
  .refine((v) => Math.abs(v * 10 - Math.round(v * 10)) < 1e-9, {
    message: 'garments.errors.fabric',
  });

export const styleOptionsSchema = z.record(
  z.string().trim().min(1).max(30),
  z.array(z.string().trim().min(1).max(30)).max(20),
);
export type StyleOptions = z.infer<typeof styleOptionsSchema>;

/** No `.default()`: a partial update must not reset omitted fields (the repo applies defaults on add). */
export const garmentInputSchema = z.object({
  name: garmentNameSchema,
  fabricPerPieceM: fabricSchema.optional(),
  styleOptions: styleOptionsSchema.optional(),
});
export type GarmentInput = z.input<typeof garmentInputSchema>;

export const garmentPatchSchema = garmentInputSchema.partial();
export type GarmentPatch = z.input<typeof garmentPatchSchema>;

/**
 * Style options are edited as text, one group per line: "Collar: Regular, Mandarin".
 * Empty lines are ignored; a group without options is dropped.
 */
export function parseStyleText(text: string): StyleOptions {
  const out: StyleOptions = {};
  for (const line of text.split(/\r?\n/)) {
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const group = line.slice(0, colon).trim();
    const options = line
      .slice(colon + 1)
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
    if (group && options.length) out[group] = options;
  }
  return out;
}

export function formatStyleText(options: StyleOptions): string {
  return Object.entries(options)
    .map(([group, values]) => `${group}: ${values.join(', ')}`)
    .join('\n');
}

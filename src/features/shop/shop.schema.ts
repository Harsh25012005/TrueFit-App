import { z } from 'zod';

/** S9 Shop setup (FEATURES.md M2) — same limits as DATABASE.md §2.1/§2.2 checks. */
export const shopSetupSchema = z.object({
  ownerName: z
    .string()
    .trim()
    .normalize('NFC')
    .min(2, { message: 'shopSetup.nameRule' })
    .max(60, { message: 'shopSetup.nameRule' }),
  shopName: z
    .string()
    .trim()
    .normalize('NFC')
    .min(2, { message: 'shopSetup.shopNameRule' })
    .max(40, { message: 'shopSetup.shopNameRule' }),
  // Optional, but valid when given (FEATURES.md M2).
  phone: z
    .string()
    .trim()
    .refine((v) => v === '' || /^[6-9]\d{9}$/.test(v), { message: 'shopSetup.phoneRule' }),
  language: z.enum(['en', 'gu', 'hi']),
  withSample: z.boolean(),
});

export type ShopSetupInput = z.infer<typeof shopSetupSchema>;

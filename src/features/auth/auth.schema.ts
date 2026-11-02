import { z } from 'zod';

/**
 * Auth form rules (FEATURES.md M1, AUTH_SECURITY.md §1.1/§5). Messages are i18n keys;
 * screens translate them with t().
 */

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ message: 'auth.errors.invalidEmail' }));

/** ≥ 8 characters with at least one letter and one digit (Supabase: letters_digits). */
export const passwordSchema = z
  .string()
  .min(8, { message: 'auth.errors.passwordRule' })
  .regex(/\p{L}/u, { message: 'auth.errors.passwordRule' })
  .regex(/\d/, { message: 'auth.errors.passwordRule' });

export const codeSchema = z.string().regex(/^\d{6}$/, { message: 'auth.errors.codeFormat' });

export const emailPasswordSchema = z.object({ email: emailSchema, password: passwordSchema });

export const signInSchema = z.object({
  email: emailSchema,
  // Sign-in only checks presence; the server decides if it is right.
  password: z.string().min(1, { message: 'auth.errors.passwordRule' }),
});

export const newPasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, {
    message: 'auth.errors.passwordsDiffer',
    path: ['confirm'],
  });

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

/** First error message (an i18n key) per field, from a failed safeParse. */
export function fieldErrors<K extends string>(error: z.ZodError): FieldErrors<K> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '');
    if (!(key in out)) out[key] = issue.message;
  }
  return out as FieldErrors<K>;
}

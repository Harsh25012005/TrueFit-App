import { z } from 'zod';

import en from '@/i18n/en.json';

import { AppError, ERROR_CODES, toAppError } from './errors';

describe('toAppError — PostgREST / Postgres (API.md §2)', () => {
  it.each([
    ['23514', 'VALIDATION_FAILED', 400],
    ['22P02', 'VALIDATION_FAILED', 400],
    ['PGRST102', 'VALIDATION_FAILED', 400],
    ['PGRST301', 'UNAUTHENTICATED', 401],
    ['PGRST116', 'NOT_FOUND', 404],
    ['23505', 'CONFLICT', 409],
    ['23503', 'CONFLICT', 409],
    ['P0001', 'BUSINESS_RULE', 422],
  ] as const)('%s → %s', (pgCode, code, status) => {
    const err = toAppError({ code: pgCode, message: 'x', details: null, hint: null });
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe(code);
    expect(err.status).toBe(status);
    // Only an expired session is worth retrying (after a token refresh).
    expect(err.retryable).toBe(code === 'UNAUTHENTICATED');
  });

  it('42501 on a customers/orders insert is PLAN_REQUIRED (402)', () => {
    const rls = { code: '42501', message: 'new row violates row-level security policy' };
    expect(toAppError(rls, { table: 'orders', op: 'insert' }).code).toBe('PLAN_REQUIRED');
    expect(toAppError(rls, { table: 'customers', op: 'upsert' }).status).toBe(402);
  });

  it('42501 anywhere else is FORBIDDEN (403)', () => {
    const rls = { code: '42501', message: 'permission denied' };
    expect(toAppError(rls, { table: 'payments', op: 'insert' }).code).toBe('FORBIDDEN');
    expect(toAppError(rls, { table: 'orders', op: 'update' }).code).toBe('FORBIDDEN');
    expect(toAppError(rls).code).toBe('FORBIDDEN');
  });

  it('RPC business errors keep the reason (e.g. MEASUREMENT_MISSING)', () => {
    const err = toAppError({ code: 'P0001', message: 'MEASUREMENT_MISSING' });
    expect(err.details).toMatchObject({ reason: 'MEASUREMENT_MISSING', pgCode: 'P0001' });
  });
});

describe('toAppError — Supabase Auth', () => {
  const auth = (code: string, status: number) => ({
    name: 'AuthApiError',
    code,
    status,
    message: 'auth failed',
  });

  it.each([
    ['invalid_credentials', 400, 'UNAUTHENTICATED'],
    ['otp_expired', 403, 'UNAUTHENTICATED'],
    ['weak_password', 422, 'VALIDATION_FAILED'],
    ['email_not_confirmed', 400, 'VALIDATION_FAILED'],
    ['user_already_exists', 422, 'CONFLICT'],
    ['over_sms_send_rate_limit', 429, 'RATE_LIMITED'],
    ['over_email_send_rate_limit', 429, 'RATE_LIMITED'],
  ] as const)('%s → %s', (authCode, status, code) => {
    const err = toAppError(auth(authCode, status));
    expect(err.code).toBe(code);
    expect(err.details).toEqual({ reason: authCode });
  });

  it('unknown auth code falls back to the HTTP status', () => {
    expect(toAppError(auth('something_new', 403)).code).toBe('FORBIDDEN');
  });

  it('retryable fetch error without a status is offline', () => {
    const err = toAppError({
      name: 'AuthRetryableFetchError',
      status: 0,
      message: 'Failed to fetch',
    });
    expect(err.code).toBe('NETWORK_OFFLINE');
    expect(err.retryable).toBe(true);
  });
});

describe('toAppError — other sources', () => {
  it('network failure → NETWORK_OFFLINE (retryable, no status)', () => {
    const err = toAppError(new TypeError('Network request failed'));
    expect(err.code).toBe('NETWORK_OFFLINE');
    expect(err.status).toBeUndefined();
    expect(err.retryable).toBe(true);
  });

  it('zod error → VALIDATION_FAILED with the first field', () => {
    const schema = z.object({ name: z.string().min(2), phone: z.string().regex(/^[6-9]\d{9}$/) });
    const result = schema.safeParse({ name: 'A', phone: '12345' });
    expect(result.success).toBe(false);
    const err = toAppError(result.error);
    expect(err.code).toBe('VALIDATION_FAILED');
    expect(err.details).toMatchObject({ field: 'name' });
    expect(Object.keys((err.details as { fields: object }).fields)).toEqual(['name', 'phone']);
  });

  it('Edge Function standard error body keeps code and request id', () => {
    const err = toAppError({
      error: {
        code: 'RATE_LIMITED',
        message: 'Slow down',
        details: { retry_after: 60 },
        request_id: '6c1f6a0e-2b7e-4c31-9b0f-7f0f4c2c0a11',
      },
    });
    expect(err.code).toBe('RATE_LIMITED');
    expect(err.requestId).toBe('6c1f6a0e-2b7e-4c31-9b0f-7f0f4c2c0a11');
    expect(err.details).toEqual({ retry_after: 60 });
  });

  it('SQLite constraint errors are not retryable', () => {
    expect(toAppError(new Error('UNIQUE constraint failed: customers.id')).code).toBe('CONFLICT');
    const check = toAppError(new Error('CHECK constraint failed: qty'));
    expect(check.code).toBe('VALIDATION_FAILED');
    expect(check.retryable).toBe(false);
  });

  it('HTTP status only → mapped by status; 5xx retryable', () => {
    expect(toAppError({ status: 404, message: 'Not found' }).code).toBe('NOT_FOUND');
    const err = toAppError({ status: 503 });
    expect(err.code).toBe('UPSTREAM_UNAVAILABLE');
    expect(err.retryable).toBe(true);
  });

  it('anything else → INTERNAL; AppError passes through unchanged', () => {
    expect(toAppError('boom').code).toBe('INTERNAL');
    expect(toAppError(undefined).code).toBe('INTERNAL');
    const original = new AppError('CONFLICT', 'x');
    expect(toAppError(original)).toBe(original);
  });
});

describe('error messages', () => {
  it('every code has a translated message key', () => {
    for (const code of ERROR_CODES) {
      expect(en.errors).toHaveProperty(code);
      expect(new AppError(code, 'x').messageKey).toBe(`errors.${code}`);
    }
  });
});

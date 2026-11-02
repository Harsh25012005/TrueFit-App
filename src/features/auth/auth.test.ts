import { AppError } from '@/lib/errors';

import { codeSchema, emailSchema, newPasswordSchema, passwordSchema } from './auth.schema';
import { authErrorKey } from './authErrors';
import { requestPasswordReset, signUpWithEmail, toSessionUser } from './auth.service';

const mockAuth = {
  signUp: jest.fn(),
  resetPasswordForEmail: jest.fn(),
};
jest.mock('@/lib/supabase', () => ({ getSupabase: () => ({ auth: mockAuth }) }));

describe('auth.schema (FEATURES.md M1)', () => {
  it('A3: password needs 8+ characters with letters and numbers', () => {
    expect(passwordSchema.safeParse('abcdefgh').success).toBe(false);
    expect(passwordSchema.safeParse('12345678').success).toBe(false);
    expect(passwordSchema.safeParse('abc123').success).toBe(false);
    expect(passwordSchema.safeParse('tailor2026').success).toBe(true);
    expect(passwordSchema.safeParse('દરજી2026x').success).toBe(true);
  });

  it('normalises email and rejects bad ones', () => {
    expect(emailSchema.parse('  Owner@Shop.IN ')).toBe('owner@shop.in');
    expect(emailSchema.safeParse('owner@').success).toBe(false);
  });

  it('code is exactly 6 digits', () => {
    expect(codeSchema.safeParse('482913').success).toBe(true);
    expect(codeSchema.safeParse('4829').success).toBe(false);
    expect(codeSchema.safeParse('48291a').success).toBe(false);
  });

  it('new password must be typed twice the same', () => {
    const r = newPasswordSchema.safeParse({ password: 'tailor2026', confirm: 'tailor2027' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.path).toEqual(['confirm']);
  });
});

describe('authErrorKey', () => {
  const err = (reason: string) => new AppError('UNAUTHENTICATED', 'x', { details: { reason } });
  it.each([
    ['invalid_credentials', 'auth.errors.wrongPassword'],
    ['email_not_confirmed', 'auth.errors.notConfirmed'],
    ['user_already_exists', 'auth.errors.emailExists'],
    ['weak_password', 'auth.errors.weakPassword'],
    ['otp_expired', 'auth.errors.codeExpired'],
  ])('%s → %s', (reason, key) => {
    expect(authErrorKey(err(reason))).toBe(key);
  });

  it('offline and unknown errors use generic keys (never raw server text)', () => {
    expect(authErrorKey(new AppError('NETWORK_OFFLINE', 'x'))).toBe('auth.offline');
    expect(authErrorKey(new AppError('RATE_LIMITED', 'x'))).toBe('errors.RATE_LIMITED');
  });
});

describe('auth.service', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sign-up with an already-registered email is a conflict', async () => {
    mockAuth.signUp.mockResolvedValue({
      data: { user: { identities: [] }, session: null },
      error: null,
    });
    await expect(signUpWithEmail('owner@shop.in', 'tailor2026')).rejects.toMatchObject({
      code: 'CONFLICT',
      details: { reason: 'user_already_exists' },
    });
  });

  it('sign-up of a new email succeeds (code sent)', async () => {
    mockAuth.signUp.mockResolvedValue({
      data: { user: { identities: [{ id: 'x' }] }, session: null },
      error: null,
    });
    await expect(signUpWithEmail('new@shop.in', 'tailor2026')).resolves.toBeUndefined();
  });

  it('A10: reset for an unknown email looks the same as for a known one', async () => {
    mockAuth.resetPasswordForEmail.mockResolvedValue({
      data: null,
      error: { name: 'AuthApiError', status: 400, code: 'user_not_found', message: 'nope' },
    });
    await expect(requestPasswordReset('nobody@shop.in')).resolves.toBeUndefined();
  });

  it('reset still reports being offline or rate limited', async () => {
    mockAuth.resetPasswordForEmail.mockRejectedValue(new TypeError('Network request failed'));
    await expect(requestPasswordReset('owner@shop.in')).rejects.toMatchObject({
      code: 'NETWORK_OFFLINE',
    });
  });

  it('maps a Supabase session to the session user (Google counts as confirmed)', () => {
    const user = toSessionUser({
      user: { id: 'u1', email: 'a@b.in', app_metadata: { provider: 'google' } },
    } as never);
    expect(user).toEqual({
      userId: 'u1',
      email: 'a@b.in',
      provider: 'google',
      emailConfirmed: true,
    });
  });
});

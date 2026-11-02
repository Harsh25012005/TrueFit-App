import * as Sentry from '@sentry/react-native';

import { AppError } from './errors';
import { logger, setErrorSink } from './logger';
import { beforeSend, captureError, initSentry, sendTestError } from './sentry';

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  setUser: jest.fn(),
  wrap: jest.fn((c: unknown) => c),
}));

const mocked = Sentry as jest.Mocked<typeof Sentry>;

describe('sentry wrapper', () => {
  beforeEach(() => jest.clearAllMocks());
  afterAll(() => setErrorSink(null));

  it('is a no-op without a DSN', () => {
    expect(initSentry('')).toBe(false);
    expect(mocked.init).not.toHaveBeenCalled();
    expect(sendTestError()).toBe(false);
    captureError(new AppError('INTERNAL', 'x'));
    expect(mocked.captureException).not.toHaveBeenCalled();
  });

  it('initialises without PII and reports AppErrors with their code', () => {
    expect(initSentry('https://key@o0.ingest.sentry.io/1')).toBe(true);
    expect(mocked.init).toHaveBeenCalledWith(
      expect.objectContaining({ sendDefaultPii: false, beforeSend: expect.any(Function) }),
    );
    const err = new AppError('CONFLICT', 'dup', { requestId: 'r1' });
    captureError(err, { table: 'orders' });
    expect(mocked.captureException).toHaveBeenCalledWith(err, {
      tags: { code: 'CONFLICT' },
      extra: { table: 'orders', details: undefined, requestId: 'r1' },
    });
  });

  it('logger.error reaches Sentry once initialised', () => {
    initSentry('https://key@o0.ingest.sentry.io/1');
    jest.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('boom', { code: '23505', message: 'duplicate' });
    expect(mocked.captureException).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'CONFLICT' }),
      expect.anything(),
    );
  });

  it('beforeSend scrubs headers, user, messages and breadcrumbs', () => {
    const event = beforeSend({
      type: undefined,
      message: 'failed for owner@shop.in',
      user: { id: 'u1', email: 'owner@shop.in', ip_address: '1.2.3.4' },
      request: {
        url: 'https://x.supabase.co/rest/v1/customers?phone=eq.9824012345',
        headers: { Authorization: 'Bearer eyJa.eyJb.c', apikey: 'anon', Accept: 'json' },
      },
      exception: { values: [{ type: 'Error', value: 'Bad phone 9824012345' }] },
      breadcrumbs: [{ message: 'otp sent to +91 98240 12345', data: { otp: '482913' } }],
      extra: { password: 'secret' },
    });
    expect(event.user).toEqual({ id: 'u1' });
    expect(event.message).toBe('failed for [redacted]');
    expect(event.request?.headers).toEqual({
      Authorization: '[redacted]',
      apikey: '[redacted]',
      Accept: 'json',
    });
    expect(event.request?.url).toContain('phone=eq.[redacted]');
    expect(event.exception?.values?.[0]?.value).toBe('Bad phone [redacted]');
    expect(event.breadcrumbs?.[0]).toEqual({
      message: 'otp sent to [redacted]',
      data: { otp: '[redacted]' },
    });
    expect(event.extra).toEqual({ password: '[redacted]' });
  });
});

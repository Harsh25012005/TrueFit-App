import { logger, scrub, scrubString, setErrorSink } from './logger';

describe('scrub', () => {
  it('removes tokens, emails and Indian mobile numbers from text', () => {
    expect(scrubString('Authorization: Bearer eyJhbGc.eyJzdWI.sig123')).toBe(
      'Authorization: Bearer [redacted]',
    );
    expect(scrubString('owner@shop.in signed in')).toBe('[redacted] signed in');
    expect(scrubString('call 98240 12345 or +91 9898123456')).toBe('call [redacted] or [redacted]');
    expect(scrubString('order #1234 total 2205')).toBe('order #1234 total 2205');
  });

  it('removes secret keys anywhere in an object, including measurement values', () => {
    const out = scrub({
      user: { id: 'u1', email: 'a@b.in', phone: '9824012345' },
      headers: { Authorization: 'Bearer x', apikey: 'anon' },
      otp: '482913',
      refresh_token: 'v1.Mr',
      measurement: { values: { chest: 40 } },
      note: 'Customer 9824012345 called',
      list: ['ok', 'x@y.com'],
    });
    expect(out).toEqual({
      user: { id: 'u1', email: '[redacted]', phone: '[redacted]' },
      headers: { Authorization: '[redacted]', apikey: '[redacted]' },
      otp: '[redacted]',
      refresh_token: '[redacted]',
      measurement: { values: '[redacted]' },
      note: 'Customer [redacted] called',
      list: ['ok', '[redacted]'],
    });
  });

  it('handles errors and circular objects', () => {
    const a: Record<string, unknown> = { name: 'a' };
    a.self = a;
    expect(scrub(a)).toEqual({ name: 'a', self: '[circular]' });
    expect(scrub(new Error('mail me at x@y.in'))).toEqual({
      name: 'Error',
      message: 'mail me at [redacted]',
    });
  });
});

describe('logger', () => {
  afterEach(() => {
    setErrorSink(null);
    jest.restoreAllMocks();
  });

  it('writes scrubbed output and forwards errors to the sink', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const sink = jest.fn();
    setErrorSink(sink);
    const err = new Error('push failed');
    logger.error('Sync push failed for 9824012345', err, { table: 'orders' });
    expect(consoleError).toHaveBeenCalledWith('[error] Sync push failed for [redacted]', {
      name: 'Error',
      message: 'push failed',
    });
    expect(sink).toHaveBeenCalledWith(err, expect.objectContaining({ table: 'orders' }));
  });

  it('debug goes to console.log in dev', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    logger.debug('hello', { token: 'abc' });
    expect(log).toHaveBeenCalledWith('[debug] hello', { token: '[redacted]' });
  });
});

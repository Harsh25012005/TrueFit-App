import {
  BACKGROUND_LOCK_MS,
  clearPin,
  hasPin,
  lockDurationMs,
  setPin,
  shouldLockAfterBackground,
  verifyPin,
} from './pin';

const mockStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => mockStore.get(k) ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => void mockStore.set(k, v)),
  deleteItemAsync: jest.fn(async (k: string) => void mockStore.delete(k)),
}));

// Node's crypto stands in for expo-crypto (same shapes).
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  getRandomBytes: jest.fn((n: number) => new Uint8Array(require('crypto').randomBytes(n))),
  digestStringAsync: jest.fn(async (_alg: string, text: string) =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('crypto').createHash('sha256').update(text).digest('hex'),
  ),
}));
jest.mock('expo-local-authentication', () => ({}));

describe('PIN (PRD M3, AUTH_SECURITY.md §1.6)', () => {
  beforeEach(() => mockStore.clear());

  it('P1: stores a salted hash, never the PIN', async () => {
    await setPin('4821');
    const stored = mockStore.get('pin.v1') ?? '';
    expect(stored).not.toContain('4821');
    const parsed = JSON.parse(stored) as { salt: string; hash: string };
    expect(parsed.salt).toMatch(/^[0-9a-f]{32}$/);
    expect(parsed.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(await hasPin()).toBe(true);
  });

  it('the same PIN gets a different hash with a new salt', async () => {
    await setPin('4821');
    const first = mockStore.get('pin.v1');
    await setPin('4821');
    expect(mockStore.get('pin.v1')).not.toBe(first);
  });

  it('accepts the right PIN and rejects a wrong one', async () => {
    await setPin('4821');
    expect(await verifyPin('4821')).toEqual({ ok: true });
    expect(await verifyPin('1111')).toMatchObject({ ok: false, reason: 'wrong', lockedForMs: 0 });
  });

  it('P2: 5 wrong tries → 30 s lock, then doubling', async () => {
    await setPin('4821');
    const t0 = 1_000_000;
    for (let i = 0; i < 4; i++) {
      expect(await verifyPin('0000', t0)).toMatchObject({ reason: 'wrong', lockedForMs: 0 });
    }
    expect(await verifyPin('0000', t0)).toMatchObject({ reason: 'wrong', lockedForMs: 30_000 });
    // Even the right PIN is refused while locked.
    expect(await verifyPin('4821', t0 + 10_000)).toMatchObject({
      reason: 'locked',
      lockedForMs: 20_000,
    });
    // After the wait, 5 more wrong tries lock for 60 s.
    const t1 = t0 + 30_000;
    for (let i = 0; i < 4; i++) await verifyPin('0000', t1);
    expect(await verifyPin('0000', t1)).toMatchObject({ lockedForMs: 60_000 });
    expect(lockDurationMs(15)).toBe(120_000);
  });

  it('a right PIN resets the counter', async () => {
    await setPin('4821');
    for (let i = 0; i < 4; i++) await verifyPin('0000');
    await verifyPin('4821');
    expect(await verifyPin('0000')).toMatchObject({ lockedForMs: 0 });
  });

  it('forgot / sign-out clears the PIN', async () => {
    await setPin('4821');
    await clearPin();
    expect(await hasPin()).toBe(false);
    expect(await verifyPin('4821')).toEqual({ ok: false, reason: 'no_pin' });
  });

  it('P3: locks after 5 minutes in the background, not before', () => {
    const now = 10_000_000;
    expect(shouldLockAfterBackground(null, now)).toBe(false);
    expect(shouldLockAfterBackground(now - BACKGROUND_LOCK_MS + 1, now)).toBe(false);
    expect(shouldLockAfterBackground(now - BACKGROUND_LOCK_MS, now)).toBe(true);
  });
});

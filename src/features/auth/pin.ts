import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';

import { secureStorage } from '@/lib/secureStorage';

/**
 * App PIN lock (PRD M3, AUTH_SECURITY.md §1.6). The PIN itself is never stored: only
 * SHA-256(salt + PIN) with a random 16-byte salt, in SecureStore (Android Keystore).
 * 5 wrong tries → 30 s wait, doubling for every further 5. "Forgot PIN" = full sign-in.
 */

const KEY_PIN = 'pin.v1';
const KEY_ATTEMPTS = 'pin.attempts';
const KEY_BIOMETRIC = 'pin.biometric';

export const PIN_TRIES_BEFORE_LOCK = 5;
export const PIN_BASE_LOCK_MS = 30_000;
/** DESIGN.md §8.10: lock after 5 minutes in the background. */
export const BACKGROUND_LOCK_MS = 5 * 60_000;

interface StoredPin {
  salt: string;
  hash: string;
}

interface Attempts {
  failures: number;
  lockedUntil: number;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, salt + pin);
}

export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

export async function hasPin(): Promise<boolean> {
  return (await secureStorage.getItem(KEY_PIN)) !== null;
}

export async function setPin(pin: string): Promise<void> {
  if (!isValidPin(pin)) throw new Error('PIN must be 4 digits');
  const salt = toHex(Crypto.getRandomBytes(16));
  const stored: StoredPin = { salt, hash: await hashPin(pin, salt) };
  await secureStorage.setItem(KEY_PIN, JSON.stringify(stored));
  await secureStorage.removeItem(KEY_ATTEMPTS);
}

async function readAttempts(): Promise<Attempts> {
  const raw = await secureStorage.getItem(KEY_ATTEMPTS);
  return raw ? (JSON.parse(raw) as Attempts) : { failures: 0, lockedUntil: 0 };
}

/** Lock length after `failures` wrong tries: 30 s at 5, 60 s at 10, 120 s at 15… */
export function lockDurationMs(failures: number): number {
  if (failures < PIN_TRIES_BEFORE_LOCK) return 0;
  const rounds = Math.floor(failures / PIN_TRIES_BEFORE_LOCK);
  return PIN_BASE_LOCK_MS * 2 ** (rounds - 1);
}

/** Milliseconds until the PIN pad unlocks again (0 = can try now). */
export async function lockRemainingMs(now = Date.now()): Promise<number> {
  const { lockedUntil } = await readAttempts();
  return Math.max(0, lockedUntil - now);
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: 'wrong'; lockedForMs: number }
  | { ok: false; reason: 'locked'; lockedForMs: number }
  | { ok: false; reason: 'no_pin' };

export async function verifyPin(pin: string, now = Date.now()): Promise<VerifyResult> {
  const raw = await secureStorage.getItem(KEY_PIN);
  if (!raw) return { ok: false, reason: 'no_pin' };
  const attempts = await readAttempts();
  if (attempts.lockedUntil > now) {
    return { ok: false, reason: 'locked', lockedForMs: attempts.lockedUntil - now };
  }
  const stored = JSON.parse(raw) as StoredPin;
  if ((await hashPin(pin, stored.salt)) === stored.hash) {
    await secureStorage.removeItem(KEY_ATTEMPTS);
    return { ok: true };
  }
  const failures = attempts.failures + 1;
  const lockMs = failures % PIN_TRIES_BEFORE_LOCK === 0 ? lockDurationMs(failures) : 0;
  await secureStorage.setItem(
    KEY_ATTEMPTS,
    JSON.stringify({ failures, lockedUntil: lockMs ? now + lockMs : 0 }),
  );
  return { ok: false, reason: 'wrong', lockedForMs: lockMs };
}

/** Removes the PIN and its counters ("Forgot PIN" → sign-in, and sign-out). */
export async function clearPin(): Promise<void> {
  await Promise.all([KEY_PIN, KEY_ATTEMPTS, KEY_BIOMETRIC].map((k) => secureStorage.removeItem(k)));
}

/** Fingerprint is offered only when the phone has it and a finger is enrolled (FEATURES.md M3). */
export async function canUseBiometrics(): Promise<boolean> {
  const [hardware, enrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  return hardware && enrolled;
}

export async function isBiometricEnabled(): Promise<boolean> {
  return (await secureStorage.getItem(KEY_BIOMETRIC)) === '1';
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  if (enabled) await secureStorage.setItem(KEY_BIOMETRIC, '1');
  else await secureStorage.removeItem(KEY_BIOMETRIC);
}

export async function unlockWithBiometrics(promptMessage: string): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    disableDeviceFallback: true,
    cancelLabel: undefined,
  });
  return result.success;
}

/** Should the app lock after coming back from the background? */
export function shouldLockAfterBackground(
  backgroundedAt: number | null,
  now = Date.now(),
): boolean {
  return backgroundedAt !== null && now - backgroundedAt >= BACKGROUND_LOCK_MS;
}

import { randomUUID } from 'expo-crypto';

/** UUID v4 generated on the device, so rows and requests can be created offline. */
export function newId(): string {
  return randomUUID();
}

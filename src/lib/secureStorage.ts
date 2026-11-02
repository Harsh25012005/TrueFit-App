import * as SecureStore from 'expo-secure-store';

/**
 * Key-value storage backed by expo-secure-store (Android Keystore). Used for the Supabase
 * session and the PIN hash — never AsyncStorage (AUTH_SECURITY.md §2).
 * SecureStore keys may only contain letters, digits, ".", "-" and "_".
 */
export const secureStorage = {
  getItem: (key: string): Promise<string | null> => SecureStore.getItemAsync(safeKey(key)),
  setItem: (key: string, value: string): Promise<void> =>
    SecureStore.setItemAsync(safeKey(key), value),
  removeItem: (key: string): Promise<void> => SecureStore.deleteItemAsync(safeKey(key)),
};

export function safeKey(key: string): string {
  return key.replace(/[^\w.-]/g, '_');
}

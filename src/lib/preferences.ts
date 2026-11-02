import { secureStorage } from './secureStorage';

/**
 * Small device-only preferences (not synced). Kept in SecureStore so the app needs no extra
 * storage library; none of these values are secrets.
 */
const KEYS = {
  language: 'pref.language',
  welcomeSeen: 'pref.welcomeSeen',
} as const;

export const preferences = {
  getLanguage: () => secureStorage.getItem(KEYS.language),
  setLanguage: (language: string) => secureStorage.setItem(KEYS.language, language),
  getWelcomeSeen: async () => (await secureStorage.getItem(KEYS.welcomeSeen)) === '1',
  setWelcomeSeen: () => secureStorage.setItem(KEYS.welcomeSeen, '1'),
  clear: async () => {
    await Promise.all(Object.values(KEYS).map((k) => secureStorage.removeItem(k)));
  },
};

import { getLocales } from 'expo-localization';
// i18next's default export is the instance we configure; its methods are meant to be called on it.
/* eslint-disable import/no-named-as-default-member */
import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';

import { preferences } from '@/lib/preferences';
import type { Script } from '@/theme/typography';

import en from './en.json';
import gu from './gu.json';
import hi from './hi.json';

export const LANGUAGES = ['en', 'gu', 'hi'] as const;
export type Language = (typeof LANGUAGES)[number];

export const resources = {
  en: { translation: en },
  gu: { translation: gu },
  hi: { translation: hi },
} as const;

/** Locale used for number/date formatting (DESIGN.md §8: Latin digits in every language). */
export const LOCALE: Record<Language, string> = { en: 'en-IN', gu: 'gu-IN', hi: 'hi-IN' };

const SCRIPT: Record<Language, Script> = { en: 'latin', gu: 'gujarati', hi: 'devanagari' };

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

/** First device language we support, else English. */
export function deviceLanguage(): Language {
  const match = getLocales().find((l) => isLanguage(l.languageCode));
  return (match?.languageCode as Language | undefined) ?? 'en';
}

type Tree = { [key: string]: string | Tree };

/** Dotted keys present in `base` but missing from `other`. */
export function findMissingKeys(base: Tree, other: Tree, prefix = ''): string[] {
  return Object.entries(base).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    const counterpart = other[key];
    if (typeof value === 'string') return typeof counterpart === 'string' ? [] : [path];
    return typeof counterpart === 'object' ? findMissingKeys(value, counterpart, path) : [path];
  });
}

if (__DEV__) {
  for (const lang of ['gu', 'hi'] as const) {
    const missing = findMissingKeys(en, resources[lang].translation);
    // Missing keys fall back to English at runtime; warn so they get translated.
    if (missing.length) console.warn(`[i18n] ${lang} is missing: ${missing.join(', ')}`);
  }
}

i18n.use(initReactI18next).init({
  resources,
  lng: deviceLanguage(),
  fallbackLng: 'en',
  supportedLngs: LANGUAGES,
  interpolation: { escapeValue: false }, // React Native renders text, no HTML.
  returnNull: false,
  initAsync: false,
});

/** Switches the UI language at once (no restart) and remembers it on this phone (M13, 2.8). */
export async function setLanguage(language: Language) {
  await i18n.changeLanguage(language);
  await preferences.setLanguage(language).catch(() => undefined);
}

/** Startup: the language chosen earlier on this phone wins over the device language. */
export async function restoreLanguage(): Promise<Language> {
  const saved = await preferences.getLanguage().catch(() => null);
  if (isLanguage(saved) && saved !== i18n.language) await i18n.changeLanguage(saved);
  return currentLanguage();
}

export function currentLanguage(): Language {
  return isLanguage(i18n.language) ? i18n.language : 'en';
}

/** Script of the active language; re-renders when the language changes. */
export function useScript(): Script {
  const { i18n: instance } = useTranslation();
  return SCRIPT[isLanguage(instance.language) ? instance.language : 'en'];
}

export default i18n;

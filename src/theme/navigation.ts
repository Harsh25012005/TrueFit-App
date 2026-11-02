import { DarkTheme, DefaultTheme, type Theme } from 'expo-router';

import { palette, type ColorScheme } from './tokens';

/**
 * React Navigation theme from tokens. Without it, every navigator paints its screens with
 * the library's default grey (#F2F2F2), which is not a DESIGN.md colour.
 */
export function navigationTheme(scheme: ColorScheme): Theme {
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const c = palette[scheme];
  return {
    ...base,
    dark: scheme === 'dark',
    colors: {
      primary: c.primary,
      background: c.background,
      card: c.surface,
      text: c.text,
      border: c.border,
      notification: c.error,
    },
  };
}

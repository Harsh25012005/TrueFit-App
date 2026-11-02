import { useColorScheme, vars } from 'nativewind';

import { palette, type ColorScheme, type ColorToken, type Palette } from './tokens';

export const COLOR_TOKENS = Object.keys(palette.light) as ColorToken[];

/** '#047D55' → '4 125 85' (the channel format Tailwind's `<alpha-value>` needs). */
export function toRgbChannels(hex: string): string {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match?.[1]) throw new Error(`Expected #RRGGBB, got ${hex}`);
  const n = parseInt(match[1], 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

/** CSS variables for one scheme; consumed by the classes in tailwind.config.js. */
export function themeVariables(scheme: ColorScheme): Record<string, string> {
  const colors = palette[scheme];
  return Object.fromEntries(
    COLOR_TOKENS.map((token) => {
      const value = colors[token];
      return [`--color-${token}`, value.startsWith('#') ? toRgbChannels(value) : value];
    }),
  );
}

const themeStyles = {
  light: vars(themeVariables('light')),
  dark: vars(themeVariables('dark')),
};

/** Style to put on the root view so every `bg-*`/`text-*` class resolves for the scheme. */
export function themeStyle(scheme: ColorScheme) {
  return themeStyles[scheme];
}

export function useThemeScheme(): ColorScheme {
  const { colorScheme } = useColorScheme();
  return colorScheme === 'dark' ? 'dark' : 'light';
}

/** Raw colour values for props that can't take a className (icons, spinners, placeholders). */
export function useColors(): Palette {
  return palette[useThemeScheme()];
}

import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular';
import { PlusJakartaSans_500Medium } from '@expo-google-fonts/plus-jakarta-sans/500Medium';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans/800ExtraBold';
import { NotoSansGujarati_400Regular } from '@expo-google-fonts/noto-sans-gujarati/400Regular';
import { NotoSansGujarati_500Medium } from '@expo-google-fonts/noto-sans-gujarati/500Medium';
import { NotoSansGujarati_600SemiBold } from '@expo-google-fonts/noto-sans-gujarati/600SemiBold';
import { NotoSansGujarati_700Bold } from '@expo-google-fonts/noto-sans-gujarati/700Bold';
import { NotoSansGujarati_800ExtraBold } from '@expo-google-fonts/noto-sans-gujarati/800ExtraBold';
import { NotoSansDevanagari_400Regular } from '@expo-google-fonts/noto-sans-devanagari/400Regular';
import { NotoSansDevanagari_500Medium } from '@expo-google-fonts/noto-sans-devanagari/500Medium';
import { NotoSansDevanagari_600SemiBold } from '@expo-google-fonts/noto-sans-devanagari/600SemiBold';
import { NotoSansDevanagari_700Bold } from '@expo-google-fonts/noto-sans-devanagari/700Bold';
import { NotoSansDevanagari_800ExtraBold } from '@expo-google-fonts/noto-sans-devanagari/800ExtraBold';
import type { TextStyle } from 'react-native';

import {
  INDIC_LINE_HEIGHT_BONUS,
  LARGE_TEXT_SCALE,
  typeScale,
  type FontWeight,
  type TypeToken,
} from './tokens';

export type Script = 'latin' | 'gujarati' | 'devanagari';

const FAMILY_PREFIX: Record<Script, string> = {
  latin: 'PlusJakartaSans',
  gujarati: 'NotoSansGujarati',
  devanagari: 'NotoSansDevanagari',
};

const WEIGHT_SUFFIX: Record<FontWeight, string> = {
  '400': '400Regular',
  '500': '500Medium',
  '600': '600SemiBold',
  '700': '700Bold',
  '800': '800ExtraBold',
};

/** Font files to load at startup (DESIGN.md §3: weights 400–800 for each script). */
export const FONT_ASSETS = {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  NotoSansGujarati_400Regular,
  NotoSansGujarati_500Medium,
  NotoSansGujarati_600SemiBold,
  NotoSansGujarati_700Bold,
  NotoSansGujarati_800ExtraBold,
  NotoSansDevanagari_400Regular,
  NotoSansDevanagari_500Medium,
  NotoSansDevanagari_600SemiBold,
  NotoSansDevanagari_700Bold,
  NotoSansDevanagari_800ExtraBold,
};

/** Android picks custom fonts by family name, one family per weight. */
export function fontFamily(script: Script, weight: FontWeight): string {
  return `${FAMILY_PREFIX[script]}_${WEIGHT_SUFFIX[weight]}`;
}

export interface TextStyleOptions {
  script?: Script;
  largeText?: boolean;
  /** Numbers always use Plus Jakarta Sans with tabular figures (DESIGN.md §3). */
  numeric?: boolean;
  /** Weight override where DESIGN.md asks for it (e.g. status pill = caption 600). */
  weight?: FontWeight;
}

/** Full text style for a DESIGN.md §3 token, adjusted for script, Large text and numbers. */
export function textStyle(token: TypeToken, options: TextStyleOptions = {}): TextStyle {
  const { script = 'latin', largeText = false, numeric = false, weight } = options;
  const t = typeScale[token];
  const family = numeric ? 'latin' : script;
  const scale = largeText ? LARGE_TEXT_SCALE : 1;
  const bonus = family === 'latin' ? 0 : INDIC_LINE_HEIGHT_BONUS;
  return {
    fontFamily: fontFamily(family, weight ?? t.weight),
    fontSize: Math.round(t.size * scale),
    lineHeight: Math.round(t.lineHeight * scale) + bonus,
    ...(numeric ? { fontVariant: ['tabular-nums'] as TextStyle['fontVariant'] } : {}),
    // Overline letter-spacing and uppercase are Latin-only (DESIGN.md §3).
    ...('letterSpacing' in t && family === 'latin'
      ? { letterSpacing: t.letterSpacing, textTransform: 'uppercase' as const }
      : {}),
  };
}

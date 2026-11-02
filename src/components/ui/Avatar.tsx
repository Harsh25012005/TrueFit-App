import { View } from 'react-native';

import { useColors } from '@/theme/colors';
import { radius } from '@/theme/tokens';

import { Text } from './Text';

/**
 * First visible letter of a word, keeping Gujarati/Devanagari vowel signs and virama
 * conjuncts together ("કિરણ" → "કિ", "ક્ષમા" → "ક્ષ").
 */
const FIRST_LETTER = /^\P{M}(?:[्્]\P{M}|\p{M})*/u;

/** Up to two initials from a name. */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => FIRST_LETTER.exec(word)?.[0] ?? '')
    .join('')
    .toLocaleUpperCase();
}

/** Avatar (DESIGN.md §6.9): 40 square, radius 4, initials on surface-muted. Decorative. */
export function Avatar({ name, testID }: { name: string; testID?: string }) {
  const colors = useColors();
  return (
    <View
      testID={testID}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{
        width: 40,
        height: 40,
        borderRadius: radius.md,
        backgroundColor: colors['surface-muted'],
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text variant="label" weight="600" color="text-muted">
        {initials(name)}
      </Text>
    </View>
  );
}

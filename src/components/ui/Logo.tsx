import { View } from 'react-native';

import { useColors } from '@/theme/colors';
import { radius } from '@/theme/tokens';

import { Text } from './Text';

/**
 * TrueFit logo (DESIGN.md §1): "TF" in on-primary on an emerald square, plus the wordmark
 * "True" (text) + "Fit" (primary) in Plus Jakarta Sans 800. Drawn with tokens until the
 * final mark artwork (assets/logo/) is supplied. The brand name is never translated.
 */
export function LogoMark({ size = 32 }: { size?: number }) {
  const colors = useColors();
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="TrueFit"
      style={{
        width: size,
        height: size,
        borderRadius: radius.md,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        script="latin"
        weight="800"
        color="on-primary"
        style={{ fontSize: Math.round(size * 0.44), lineHeight: Math.round(size * 0.56) }}
      >
        TF
      </Text>
    </View>
  );
}

export function Wordmark({ size = 30 }: { size?: number }) {
  return (
    <Text
      script="latin"
      weight="800"
      accessibilityRole="header"
      style={{ fontSize: size, lineHeight: Math.round(size * 1.2) }}
    >
      True
      <Text script="latin" weight="800" color="primary" style={{ fontSize: size }}>
        Fit
      </Text>
    </Text>
  );
}

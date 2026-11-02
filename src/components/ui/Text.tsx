import type { ComponentRef, Ref } from 'react';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { useScript } from '@/i18n';
import { useColors } from '@/theme/colors';
import type { ColorToken, FontWeight, TypeToken } from '@/theme/tokens';
import { textStyle, type Script } from '@/theme/typography';

export interface TextProps extends RNTextProps {
  variant?: TypeToken;
  color?: ColorToken;
  /** Render with Plus Jakarta Sans tabular figures (amounts, counts, dates). */
  numeric?: boolean;
  /** Script of the text; defaults to the app language's script. */
  script?: Script;
  /** Weight override (only where DESIGN.md specifies one). */
  weight?: FontWeight;
  ref?: Ref<ComponentRef<typeof RNText>>;
}

/** Every piece of UI text goes through this so fonts, sizes and colours follow DESIGN.md §3. */
export function Text({
  variant = 'body',
  color = 'text',
  numeric = false,
  script,
  weight,
  style,
  ...rest
}: TextProps) {
  const colors = useColors();
  const appScript = useScript();
  return (
    <RNText
      style={[
        textStyle(variant, { script: script ?? appScript, numeric, weight }),
        { color: colors[color] },
        style,
      ]}
      {...rest}
    />
  );
}

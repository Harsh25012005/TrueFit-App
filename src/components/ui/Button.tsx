import { ActivityIndicator, Pressable, View, type ViewStyle } from 'react-native';

import { useColors } from '@/theme/colors';
import { radius, type ColorToken, type Palette } from '@/theme/tokens';

import { FocusRing } from './FocusRing';
import { Icon, type IconName } from './Icon';
import { pressTransform, useReducedMotion } from './motion';
import { Text } from './Text';
import { useInteraction } from './useInteraction';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

interface InteractionState {
  active: boolean; // pressed or hovered
  disabled: boolean;
}

interface VariantLook {
  container: ViewStyle;
  text: ColorToken;
  underline?: boolean;
}

/** DESIGN.md §6.1 state table. */
function lookFor(
  variant: ButtonVariant,
  { active, disabled }: InteractionState,
  c: Palette,
): VariantLook {
  switch (variant) {
    case 'primary':
      return {
        container: {
          backgroundColor: active && !disabled ? c['primary-pressed'] : c.primary,
          opacity: disabled ? 0.4 : 1,
        },
        text: 'on-primary',
      };
    case 'secondary':
      return {
        container: {
          backgroundColor: active && !disabled ? c['surface-muted'] : c.surface,
          borderWidth: 1,
          borderColor: disabled ? c['border-subtle'] : active ? c['text-faint'] : c.border,
        },
        text: disabled ? 'text-faint' : 'text',
      };
    case 'ghost':
      return {
        container: {},
        text: disabled ? 'text-faint' : 'primary',
        underline: active && !disabled,
      };
    case 'destructive':
      return {
        container: {
          backgroundColor: active && !disabled ? c['error-subtle'] : c.surface,
          borderWidth: 1,
          borderColor: c['error-subtle'],
          opacity: disabled ? 0.4 : 1,
        },
        text: 'error',
      };
  }
}

const SPINNER: Record<ButtonVariant, ColorToken> = {
  primary: 'on-primary',
  secondary: 'text',
  ghost: 'primary',
  destructive: 'error',
};

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: 'md' | 'sm';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: ButtonProps) {
  const colors = useColors();
  const reduced = useReducedMotion();
  const inactive = disabled || loading;
  const { pressed, active, focused, handlers } = useInteraction(inactive);
  const look = lookFor(variant, { active, disabled }, colors);

  return (
    <Pressable
      testID={testID}
      onPress={inactive ? undefined : onPress}
      disabled={inactive}
      {...handlers}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={fullWidth ? { alignSelf: 'stretch' } : { alignSelf: 'flex-start' }}
    >
      <View
        testID={testID ? `${testID}-body` : undefined}
        style={[
          {
            height: size === 'md' ? 48 : 40,
            paddingHorizontal: variant === 'ghost' ? 0 : 20,
            borderRadius: radius.md,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transform: pressTransform(pressed, reduced),
          },
          look.container,
        ]}
      >
        {loading ? (
          <ActivityIndicator size={18} color={colors[SPINNER[variant]]} testID="button-spinner" />
        ) : icon ? (
          <Icon name={icon} size="md" color={look.text} />
        ) : null}
        <Text
          variant="body-strong"
          color={look.text}
          numberOfLines={1}
          style={look.underline ? { textDecorationLine: 'underline' } : undefined}
        >
          {label}
        </Text>
        <FocusRing visible={focused} color={variant === 'destructive' ? 'error' : 'primary'} />
      </View>
    </Pressable>
  );
}

export interface IconButtonProps {
  icon: IconName;
  /** Required: icon-only buttons must be named for TalkBack (DESIGN.md §8.4). */
  accessibilityLabel: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  color?: ColorToken;
  testID?: string;
}

/** 48×48 icon button (DESIGN.md §6.1 "Icon button"). */
export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  disabled = false,
  loading = false,
  color = 'text',
  testID,
}: IconButtonProps) {
  const colors = useColors();
  const inactive = disabled || loading;
  const { active, focused, handlers } = useInteraction(inactive);

  return (
    <Pressable
      testID={testID}
      onPress={inactive ? undefined : onPress}
      disabled={inactive}
      {...handlers}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={{
        width: 48,
        height: 48,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: active ? colors['surface-muted'] : 'transparent',
      }}
    >
      {loading ? (
        <ActivityIndicator size={18} color={colors.text} testID="button-spinner" />
      ) : (
        <Icon name={icon} size="lg" color={disabled ? 'text-faint' : color} />
      )}
      <FocusRing visible={focused} />
    </Pressable>
  );
}

import { useEffect, useState, type ReactNode, type Ref } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Pressable,
  TextInput,
  useAnimatedValue,
  View,
  type TextInputInstance,
  type TextInputProps,
} from 'react-native';

import { useColors } from '@/theme/colors';
import { radius } from '@/theme/tokens';
import { textStyle } from '@/theme/typography';
import { useScript } from '@/i18n';

import { Icon } from './Icon';
import { useReducedMotion } from './motion';
import { Text } from './Text';

const HALO = 3;

export interface InputProps extends Omit<TextInputProps, 'editable' | 'style'> {
  /** Always visible above the field (DESIGN.md §8.9: never placeholder-only). */
  label: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  /** Async check in progress (e.g. OTP send): trailing 16 dp spinner. */
  loading?: boolean;
  /** Fixed text before the value, e.g. "+91" or "₹". */
  prefix?: string;
  /** Fixed text or node after the value, e.g. the unit "in". */
  suffix?: ReactNode;
  testID?: string;
  ref?: Ref<TextInputInstance>;
}

function useShake(trigger: string | undefined, reduced: boolean) {
  const offset = useAnimatedValue(0);
  useEffect(() => {
    if (!trigger || reduced) return;
    const step = (toValue: number) =>
      Animated.timing(offset, { toValue, duration: 50, useNativeDriver: true });
    Animated.sequence([step(4), step(-4), step(4), step(0)]).start();
  }, [trigger, reduced, offset]);
  return offset;
}

/** Text input with every DESIGN.md §6.2 state; variants (Phone, Money, …) build on it. */
export function Input({
  label,
  hint,
  error,
  disabled = false,
  loading = false,
  prefix,
  suffix,
  multiline,
  testID,
  onFocus,
  onBlur,
  ref,
  ...rest
}: InputProps) {
  const colors = useColors();
  const script = useScript();
  const reduced = useReducedMotion();
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const shake = useShake(error, reduced);

  useEffect(() => {
    if (error) AccessibilityInfo.announceForAccessibility(`${label}: ${error}`);
  }, [error, label]);

  const borderColor = error
    ? colors.error
    : focused
      ? colors.primary
      : hovered && !disabled
        ? colors['text-faint']
        : colors.border;
  const haloColor = error ? colors['error-subtle'] : focused ? colors['primary-subtle'] : null;

  return (
    <View>
      <Text variant="label" color="text-muted" style={{ marginBottom: 6 }}>
        {label}
      </Text>
      <Animated.View style={{ transform: [{ translateX: shake }] }}>
        <Pressable
          onHoverIn={() => setHovered(true)}
          onHoverOut={() => setHovered(false)}
          accessible={false}
        >
          {haloColor && !disabled ? (
            <View
              pointerEvents="none"
              testID={testID ? `${testID}-halo` : undefined}
              style={{
                position: 'absolute',
                top: -HALO,
                left: -HALO,
                right: -HALO,
                bottom: -HALO,
                borderWidth: HALO,
                borderColor: haloColor,
                borderRadius: radius.md,
              }}
            />
          ) : null}
          <View
            testID={testID ? `${testID}-field` : undefined}
            style={{
              minHeight: multiline ? 96 : 48,
              borderWidth: 1,
              borderColor,
              borderRadius: radius.md,
              backgroundColor: disabled ? colors['surface-muted'] : colors.surface,
              paddingHorizontal: 14,
              flexDirection: 'row',
              alignItems: multiline ? 'flex-start' : 'center',
              gap: 8,
            }}
          >
            {prefix ? (
              <Text color="text-muted" numeric>
                {prefix}
              </Text>
            ) : null}
            <TextInput
              ref={ref}
              testID={testID}
              editable={!disabled}
              multiline={multiline}
              accessibilityLabel={label}
              accessibilityHint={error ?? hint}
              accessibilityState={{ disabled }}
              placeholderTextColor={colors['text-muted']}
              selectionColor={colors.primary}
              onFocus={(e) => {
                setFocused(true);
                onFocus?.(e);
              }}
              onBlur={(e) => {
                setFocused(false);
                onBlur?.(e);
              }}
              style={[
                textStyle('body', { script }),
                {
                  flex: 1,
                  color: disabled ? colors['text-muted'] : colors.text,
                  paddingVertical: multiline ? 12 : 0,
                  textAlignVertical: multiline ? 'top' : 'center',
                },
              ]}
              {...rest}
            />
            {loading ? (
              <ActivityIndicator size={16} color={colors['text-muted']} testID="input-spinner" />
            ) : null}
            {typeof suffix === 'string' ? <Text color="text-muted">{suffix}</Text> : suffix}
          </View>
        </Pressable>
      </Animated.View>
      {error ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
          <Icon name="alert-circle" size="sm" color="error" />
          <Text variant="caption" color="error" accessibilityLiveRegion="polite">
            {error}
          </Text>
        </View>
      ) : hint ? (
        <Text variant="caption" color="text-muted" style={{ marginTop: 6 }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

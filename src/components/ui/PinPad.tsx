import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useColors } from '@/theme/colors';
import { radius } from '@/theme/tokens';

import { FocusRing } from './FocusRing';
import { Icon } from './Icon';
import { Text } from './Text';
import { useInteraction } from './useInteraction';

export const PIN_LENGTH = 4;

/** Filled/empty squares for the entered digits (DESIGN.md §6.9: 14 dp, radius 2). */
export function PinDots({ count, length = PIN_LENGTH }: { count: number; length?: number }) {
  const colors = useColors();
  const { t } = useTranslation();
  return (
    <View
      accessible
      accessibilityLabel={t('pin.enteredDigits', { count })}
      accessibilityLiveRegion="polite"
      style={{ flexDirection: 'row', gap: 16, justifyContent: 'center' }}
    >
      {Array.from({ length }, (_, i) => (
        <View
          key={i}
          testID={i < count ? 'pin-dot-filled' : 'pin-dot-empty'}
          style={{
            width: 14,
            height: 14,
            borderRadius: radius.sm,
            borderWidth: 1,
            borderColor: i < count ? colors.primary : colors.border,
            backgroundColor: i < count ? colors.primary : 'transparent',
          }}
        />
      ))}
    </View>
  );
}

function Key({
  label,
  accessibilityLabel,
  onPress,
  disabled,
  children,
}: {
  label?: string;
  accessibilityLabel: string;
  onPress: () => void;
  disabled: boolean;
  children?: React.ReactNode;
}) {
  const colors = useColors();
  const { active, focused, handlers } = useInteraction(disabled);
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      {...handlers}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={{
        width: 72,
        height: 64,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: active ? colors['surface-muted'] : colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {label ? (
        <Text variant="title-2" numeric>
          {label}
        </Text>
      ) : (
        children
      )}
      <FocusRing visible={focused} />
    </Pressable>
  );
}

export interface PinPadProps {
  value: string;
  onChange: (value: string) => void;
  /** Called once when the last digit is entered. */
  onComplete?: (pin: string) => void;
  /** Shows the fingerprint key in the bottom-left slot. */
  onBiometric?: () => void;
  disabled?: boolean;
  length?: number;
}

/** PIN pad (DESIGN.md §6.9): 3×4 keys 72×64, radius 4, 1 px border. */
export function PinPad({
  value,
  onChange,
  onComplete,
  onBiometric,
  disabled = false,
  length = PIN_LENGTH,
}: PinPadProps) {
  const { t } = useTranslation();

  const press = (digit: string) => {
    if (value.length >= length) return;
    const next = value + digit;
    onChange(next);
    if (next.length === length) onComplete?.(next);
  };

  const rows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
  ];

  return (
    <View style={{ gap: 12, alignItems: 'center' }}>
      {rows.map((row) => (
        <View key={row[0]} style={{ flexDirection: 'row', gap: 12 }}>
          {row.map((d) => (
            <Key
              key={d}
              label={d}
              accessibilityLabel={d}
              onPress={() => press(d)}
              disabled={disabled}
            />
          ))}
        </View>
      ))}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {onBiometric ? (
          <Key
            accessibilityLabel={t('pin.useFingerprint')}
            onPress={onBiometric}
            disabled={disabled}
          >
            <Icon name="fingerprint" size="lg" color="primary" />
          </Key>
        ) : (
          <View style={{ width: 72, height: 64 }} />
        )}
        <Key label="0" accessibilityLabel="0" onPress={() => press('0')} disabled={disabled} />
        <Key
          accessibilityLabel={t('pin.deleteDigit')}
          onPress={() => onChange(value.slice(0, -1))}
          disabled={disabled || value.length === 0}
        >
          <Icon name="backspace" size="lg" color={value.length === 0 ? 'text-faint' : 'text'} />
        </Key>
      </View>
    </View>
  );
}

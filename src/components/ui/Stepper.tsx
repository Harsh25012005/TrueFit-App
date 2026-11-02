import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useColors } from '@/theme/colors';
import { radius } from '@/theme/tokens';

import { FocusRing } from './FocusRing';
import { Icon } from './Icon';
import { Text } from './Text';
import { useInteraction } from './useInteraction';

export interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** What is being counted, for TalkBack ("Shirt quantity"). */
  accessibilityLabel: string;
  disabled?: boolean;
  testID?: string;
}

function StepButton({
  icon,
  label,
  enabled,
  onPress,
  testID,
}: {
  icon: 'minus' | 'plus';
  label: string;
  enabled: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const colors = useColors();
  const { active, focused, handlers } = useInteraction(!enabled);
  return (
    <Pressable
      testID={testID}
      onPress={enabled ? onPress : undefined}
      disabled={!enabled}
      {...handlers}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !enabled }}
      hitSlop={4}
      style={{
        width: 40,
        height: 38,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: active ? colors['surface-muted'] : 'transparent',
      }}
    >
      {/* Disabled minus at 0 uses the border colour (DESIGN.md §6.3). */}
      <Icon name={icon} size="md" color={enabled ? 'text' : 'border'} />
      <FocusRing visible={focused} />
    </Pressable>
  );
}

/** Quantity stepper "− n +" (DESIGN.md §6.3): one outline, 40 high, no inner borders. */
export function Stepper({
  value,
  onChange,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  accessibilityLabel,
  disabled = false,
  testID,
}: StepperProps) {
  const colors = useColors();
  const { t } = useTranslation();
  return (
    <View
      testID={testID}
      accessible={false}
      style={{
        height: 40,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        alignSelf: 'flex-start',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <StepButton
        icon="minus"
        label={`${t('common.decrease')} ${accessibilityLabel}`}
        enabled={!disabled && value > min}
        onPress={() => onChange(value - 1)}
        testID={testID ? `${testID}-minus` : undefined}
      />
      <Text
        variant="body-strong"
        numeric
        accessibilityLabel={`${accessibilityLabel}: ${value}`}
        accessibilityLiveRegion="polite"
        style={{ minWidth: 32, textAlign: 'center' }}
      >
        {value}
      </Text>
      <StepButton
        icon="plus"
        label={`${t('common.increase')} ${accessibilityLabel}`}
        enabled={!disabled && value < max}
        onPress={() => onChange(value + 1)}
        testID={testID ? `${testID}-plus` : undefined}
      />
    </View>
  );
}

import { Pressable, View } from 'react-native';

import { useColors } from '@/theme/colors';
import { radius } from '@/theme/tokens';

import { FocusRing } from './FocusRing';
import { Text } from './Text';
import { useInteraction } from './useInteraction';

export interface ChipProps {
  label: string;
  count?: number;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  testID?: string;
}

/** Filter chip (DESIGN.md §6.3): 36 high, selected = ink fill. */
export function Chip({
  label,
  count,
  selected = false,
  disabled = false,
  onPress,
  testID,
}: ChipProps) {
  const colors = useColors();
  const { active, focused, handlers } = useInteraction(disabled);
  const textColor = disabled ? 'text-faint' : selected ? 'on-secondary' : 'text-muted';

  return (
    <Pressable
      testID={testID}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      {...handlers}
      accessibilityRole="button"
      accessibilityLabel={count === undefined ? label : `${label}, ${count}`}
      accessibilityState={{ selected, disabled }}
      hitSlop={6}
    >
      <View
        testID={testID ? `${testID}-body` : undefined}
        style={{
          height: 36,
          paddingHorizontal: 12,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: selected ? colors.secondary : colors.border,
          backgroundColor: selected
            ? colors.secondary
            : active
              ? colors['surface-muted']
              : colors.surface,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <Text variant="label" color={textColor} numberOfLines={1}>
          {label}
        </Text>
        {count !== undefined ? (
          <Text variant="label" color={textColor} numeric>
            {count}
          </Text>
        ) : null}
      </View>
      <FocusRing visible={focused} />
    </Pressable>
  );
}

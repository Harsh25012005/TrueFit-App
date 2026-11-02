import { Pressable, View } from 'react-native';

import { useColors } from '@/theme/colors';
import { radius } from '@/theme/tokens';

import { FocusRing } from './FocusRing';
import { Text } from './Text';
import { useInteraction } from './useInteraction';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  /** Script of this label when it differs from the app language (e.g. "ગુ" in the language switch). */
  script?: 'latin' | 'gujarati' | 'devanagari';
}

export interface SegmentedProps<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Names the group for TalkBack. */
  accessibilityLabel: string;
  disabled?: boolean;
  testID?: string;
}

function Segment<T extends string>({
  option,
  selected,
  disabled,
  onPress,
  testID,
}: {
  option: SegmentOption<T>;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const colors = useColors();
  const { focused, handlers } = useInteraction(disabled);
  return (
    <Pressable
      testID={testID}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      {...handlers}
      accessibilityRole="radio"
      accessibilityLabel={option.label}
      accessibilityState={{ selected, checked: selected, disabled }}
      style={{
        flex: 1,
        minHeight: 42,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: selected ? colors.border : 'transparent',
        backgroundColor: selected ? colors.surface : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
      }}
    >
      <Text
        variant="label"
        weight={selected ? '600' : undefined}
        color={disabled ? 'text-faint' : selected ? 'primary' : 'text-muted'}
        script={option.script}
        numberOfLines={1}
      >
        {option.label}
      </Text>
      <FocusRing visible={focused} />
    </Pressable>
  );
}

/** Segmented control (DESIGN.md §6.3): muted track, selected segment raised with a 1 px border. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  disabled = false,
  testID,
}: SegmentedProps<T>) {
  const colors = useColors();
  return (
    <View
      testID={testID}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={{
        flexDirection: 'row',
        padding: 3,
        gap: 3,
        borderRadius: radius.md,
        backgroundColor: colors['surface-muted'],
      }}
    >
      {options.map((option) => (
        <Segment
          key={option.value}
          option={option}
          selected={option.value === value}
          disabled={disabled}
          onPress={() => onChange(option.value)}
          testID={testID ? `${testID}-${option.value}` : undefined}
        />
      ))}
    </View>
  );
}

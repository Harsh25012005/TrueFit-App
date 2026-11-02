import { Pressable, View } from 'react-native';

import { useColors } from '@/theme/colors';
import { radius } from '@/theme/tokens';

import { FocusRing } from './FocusRing';
import { useInteraction } from './useInteraction';

export interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  /** Required: the visible row label, so TalkBack reads "Dark mode, switch, on". */
  accessibilityLabel: string;
  disabled?: boolean;
  testID?: string;
}

const TRACK_W = 44;
const TRACK_H = 26;
const PAD = 3;
const THUMB = TRACK_H - PAD * 2;

/** Switch (DESIGN.md §6.3): 44×26 track, radius 2; off = border, on = primary; thumb surface. */
export function Switch({
  value,
  onValueChange,
  accessibilityLabel,
  disabled = false,
  testID,
}: SwitchProps) {
  const colors = useColors();
  const { focused, handlers } = useInteraction(disabled);
  return (
    <Pressable
      testID={testID}
      onPress={disabled ? undefined : () => onValueChange(!value)}
      disabled={disabled}
      {...handlers}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      hitSlop={11}
      style={{ opacity: disabled ? 0.4 : 1 }}
    >
      <View
        testID={testID ? `${testID}-track` : undefined}
        style={{
          width: TRACK_W,
          height: TRACK_H,
          borderRadius: radius.sm,
          backgroundColor: value ? colors.primary : colors.border,
          padding: PAD,
          alignItems: value ? 'flex-end' : 'flex-start',
        }}
      >
        <View
          style={{
            width: THUMB,
            height: THUMB,
            borderRadius: radius.sm,
            backgroundColor: colors.surface,
          }}
        />
      </View>
      <FocusRing visible={focused} />
    </Pressable>
  );
}

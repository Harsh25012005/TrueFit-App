import { useRef, useState } from 'react';
import { Pressable, TextInput, View, type TextInputInstance } from 'react-native';

import { useColors } from '@/theme/colors';
import { radius } from '@/theme/tokens';

import { Text } from './Text';

export interface CodeInputProps {
  value: string;
  onChangeText: (digits: string) => void;
  /** Called once the last digit is typed or pasted. */
  onComplete?: (code: string) => void;
  length?: number;
  /** Visible label is the screen title; this names the field for TalkBack. */
  accessibilityLabel: string;
  error?: boolean;
  disabled?: boolean;
  testID?: string;
}

/**
 * Code boxes (DESIGN.md §7 S5): 6 boxes 48×56, radius 4. One hidden text field drives them,
 * so typing auto-advances and pasting the whole code works.
 */
export function CodeInput({
  value,
  onChangeText,
  onComplete,
  length = 6,
  accessibilityLabel,
  error = false,
  disabled = false,
  testID,
}: CodeInputProps) {
  const colors = useColors();
  const inputRef = useRef<TextInputInstance>(null);
  const [focused, setFocused] = useState(false);

  const handleChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, length);
    onChangeText(digits);
    if (digits.length === length && value.length !== length) onComplete?.(digits);
  };

  return (
    <Pressable
      onPress={() => inputRef.current?.focus()}
      accessible={false}
      style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}
    >
      {Array.from({ length }, (_, i) => {
        const active = focused && i === Math.min(value.length, length - 1);
        return (
          <View
            key={i}
            testID={testID ? `${testID}-box-${i}` : undefined}
            style={{
              width: 48,
              height: 56,
              borderRadius: radius.md,
              borderWidth: active ? 2 : 1,
              borderColor: error ? colors.error : active ? colors.primary : colors.border,
              backgroundColor: disabled ? colors['surface-muted'] : colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text variant="title-2" numeric>
              {value[i] ?? ''}
            </Text>
          </View>
        );
      })}
      <TextInput
        ref={inputRef}
        testID={testID}
        value={value}
        onChangeText={handleChange}
        editable={!disabled}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={length}
        accessibilityLabel={accessibilityLabel}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        caretHidden
        style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0 }}
      />
    </Pressable>
  );
}

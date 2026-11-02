import { useState, type Ref } from 'react';
import { TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useScript } from '@/i18n';
import { useColors } from '@/theme/colors';
import { radius } from '@/theme/tokens';
import { textStyle } from '@/theme/typography';

import { Icon } from './Icon';

export interface SearchInputProps extends Omit<TextInputProps, 'style'> {
  value: string;
  onChangeText: (text: string) => void;
  testID?: string;
  ref?: Ref<TextInputInstance>;
}

/**
 * Search box (DESIGN.md §6.2): leading search icon. The trailing mic is V2 voice search
 * (PRD V10) and is not shown in the MVP.
 */
export function SearchInput({
  value,
  onChangeText,
  placeholder,
  testID,
  ref,
  ...rest
}: SearchInputProps) {
  const colors = useColors();
  const script = useScript();
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);
  const label = placeholder ?? t('common.search');

  return (
    <View
      testID={testID ? `${testID}-field` : undefined}
      style={{
        height: 48,
        borderWidth: 1,
        borderColor: focused ? colors.primary : colors.border,
        borderRadius: radius.md,
        backgroundColor: colors.surface,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <Icon name="search" size="md" color="text-muted" />
      <TextInput
        ref={ref}
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={label}
        accessibilityLabel={label}
        accessibilityRole="search"
        returnKeyType="search"
        autoCorrect={false}
        placeholderTextColor={colors['text-muted']}
        selectionColor={colors.primary}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[textStyle('body', { script }), { flex: 1, color: colors.text, paddingVertical: 0 }]}
        {...rest}
      />
    </View>
  );
}

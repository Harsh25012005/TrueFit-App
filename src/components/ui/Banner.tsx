import { View } from 'react-native';

import { useColors } from '@/theme/colors';
import { radius, type ColorToken } from '@/theme/tokens';

import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type BannerVariant = 'info' | 'warning' | 'error';

const LOOK: Record<BannerVariant, { bg: ColorToken; icon: IconName; iconColor: ColorToken }> = {
  info: { bg: 'primary-subtle', icon: 'info-circle', iconColor: 'primary' },
  warning: { bg: 'warning-subtle', icon: 'alert-circle', iconColor: 'warning' },
  error: { bg: 'error-subtle', icon: 'alert-circle', iconColor: 'error' },
};

export interface BannerProps {
  variant?: BannerVariant;
  message: string;
  action?: { label: string; onPress: () => void };
  testID?: string;
}

/** Inline banner (DESIGN.md §6.9): icon + text + optional action; never colour alone. */
export function Banner({ variant = 'info', message, action, testID }: BannerProps) {
  const colors = useColors();
  const look = LOOK[variant];
  return (
    <View
      testID={testID}
      // Errors are announced as soon as they appear (DESIGN.md §8.2).
      accessibilityLiveRegion={variant === 'error' ? 'assertive' : 'polite'}
      style={{
        backgroundColor: colors[look.bg],
        borderRadius: radius.md,
        paddingVertical: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <Icon name={look.icon} size="md" color={look.iconColor} />
      <Text variant="label" color={variant === 'error' ? 'error' : 'text'} style={{ flex: 1 }}>
        {message}
      </Text>
      {action ? (
        <Button variant="ghost" size="sm" label={action.label} onPress={action.onPress} />
      ) : null}
    </View>
  );
}

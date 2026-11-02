import { View } from 'react-native';

import { useColors } from '@/theme/colors';
import { radius } from '@/theme/tokens';

import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface EmptyStateProps {
  icon: IconName;
  title: string;
  text?: string;
  /** One action only (DESIGN.md §6.9). */
  action?: { label: string; onPress: () => void };
  testID?: string;
}

export function EmptyState({ icon, title, text, action, testID }: EmptyStateProps) {
  const colors = useColors();
  return (
    <View testID={testID} style={{ alignItems: 'center', paddingVertical: 32, gap: 8 }}>
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: radius.md,
          backgroundColor: colors['surface-muted'],
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 4,
        }}
      >
        <Icon name={icon} size="lg" color="text-muted" />
      </View>
      <Text variant="title-3" accessibilityRole="header" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      {text ? (
        <Text color="text-muted" numberOfLines={1} style={{ textAlign: 'center' }}>
          {text}
        </Text>
      ) : null}
      {action ? (
        <View style={{ marginTop: 8 }}>
          <Button label={action.label} onPress={action.onPress} />
        </View>
      ) : null}
    </View>
  );
}

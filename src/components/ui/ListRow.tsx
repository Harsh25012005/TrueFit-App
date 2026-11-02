import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { useColors } from '@/theme/colors';

import { FocusRing } from './FocusRing';
import { Icon } from './Icon';
import { Text } from './Text';
import { useInteraction } from './useInteraction';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  /** Avatar, icon tile, … */
  leading?: ReactNode;
  /** Right-aligned value, rendered with tabular figures (e.g. "₹950 due"). */
  value?: string;
  /** Any other trailing node (status pill, action button). */
  trailing?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  /** One sentence for TalkBack (DESIGN.md §8.4); defaults to title, subtitle and value. */
  accessibilityLabel?: string;
  testID?: string;
}

/** List row (DESIGN.md §6.7): min 56 dp, padding 12/16, chevron when it opens something. */
export function ListRow({
  title,
  subtitle,
  leading,
  value,
  trailing,
  onPress,
  disabled = false,
  accessibilityLabel,
  testID,
}: ListRowProps) {
  const colors = useColors();
  const { active, focused, handlers } = useInteraction(disabled || !onPress);
  const label = accessibilityLabel ?? [title, subtitle, value].filter(Boolean).join(', ');

  const content = (
    <View
      testID={testID ? `${testID}-body` : undefined}
      style={{
        minHeight: 56,
        paddingVertical: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: active ? colors['surface-muted'] : 'transparent',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {leading}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="title-3" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="label" color="text-muted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="label" numeric style={{ textAlign: 'right' }}>
          {value}
        </Text>
      ) : null}
      {trailing}
      {onPress ? <Icon name="chevron-right" size="md" color="text-faint" /> : null}
    </View>
  );

  if (!onPress) {
    return (
      <View testID={testID} accessible accessibilityLabel={label}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      {...handlers}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
    >
      {content}
      <FocusRing visible={focused} />
    </Pressable>
  );
}

/** Group header above a list card: `overline`, muted, 8 top / 6 bottom (DESIGN.md §6.7). */
export function SectionHeader({ title }: { title: string }) {
  return (
    <Text
      variant="overline"
      color="text-muted"
      accessibilityRole="header"
      style={{ marginTop: 8, marginBottom: 6 }}
    >
      {title}
    </Text>
  );
}

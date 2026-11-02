import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { IconButton, Text } from '@/components/ui';

export interface FieldRowProps {
  /** 1-based position shown as the row number. */
  number: number;
  name: string;
  measurementCount: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  testID?: string;
}

/** One measurement field on S26 (DESIGN.md §7): number, name, "8 measurements", ↑↓ and edit. */
export function FieldRow({
  number,
  name,
  measurementCount,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onEdit,
  testID,
}: FieldRowProps) {
  const { t } = useTranslation();
  const count = t('garments.fieldMeasurements', { count: measurementCount });
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={`${number}, ${name}, ${count}`}
      style={{
        minHeight: 56,
        paddingLeft: 16,
        paddingRight: 4,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <Text variant="label" color="text-muted" numeric style={{ width: 22 }}>
        {number}
      </Text>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="title-3" numberOfLines={1}>
          {name}
        </Text>
        <Text variant="caption" color="text-muted" numberOfLines={1}>
          {count}
        </Text>
      </View>
      <IconButton
        icon="chevron-up"
        accessibilityLabel={`${t('common.moveUp')}: ${name}`}
        disabled={!canMoveUp}
        onPress={onMoveUp}
        testID={testID ? `${testID}-up` : undefined}
      />
      <IconButton
        icon="chevron-down"
        accessibilityLabel={`${t('common.moveDown')}: ${name}`}
        disabled={!canMoveDown}
        onPress={onMoveDown}
        testID={testID ? `${testID}-down` : undefined}
      />
      <IconButton
        icon="edit"
        accessibilityLabel={`${t('common.edit')}: ${name}`}
        onPress={onEdit}
        testID={testID ? `${testID}-edit` : undefined}
      />
    </View>
  );
}

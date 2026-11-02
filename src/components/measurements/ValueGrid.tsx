import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useColors } from '@/theme/colors';
import { radius } from '@/theme/tokens';

export interface GridCell {
  key: string;
  label: string;
  /** Already formatted in the shop's unit; "—" when not measured. */
  value: string;
  /** Changed in this edit (S24): primary-subtle cell. */
  changed?: boolean;
  /** Previous value, shown as "was 38" under a changed cell. */
  was?: string;
}

/** Measurement values in 3 columns (DESIGN.md S21 / S24). Numbers use tabular figures. */
export function ValueGrid({
  cells,
  wasLabel,
}: {
  cells: GridCell[];
  wasLabel?: (v: string) => string;
}) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
      {cells.map((cell) => (
        <View key={cell.key} style={{ width: '33.333%', padding: 4 }}>
          <View
            accessible
            accessibilityLabel={`${cell.label}: ${cell.value}${cell.was && wasLabel ? `, ${wasLabel(cell.was)}` : ''}`}
            style={{
              backgroundColor: cell.changed ? colors['primary-subtle'] : colors['surface-muted'],
              borderRadius: radius.md,
              paddingVertical: 8,
              paddingHorizontal: 10,
              minHeight: 56,
            }}
          >
            <Text variant="caption" color="text-muted" numberOfLines={1}>
              {cell.label}
            </Text>
            <Text variant="body-strong" numeric color={cell.changed ? 'primary' : 'text'}>
              {cell.value}
            </Text>
            {cell.changed && cell.was && wasLabel ? (
              <Text variant="caption" color="text-muted" numeric>
                {wasLabel(cell.was)}
              </Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

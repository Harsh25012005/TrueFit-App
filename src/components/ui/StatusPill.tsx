import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useColors } from '@/theme/colors';
import { radius, type ColorToken } from '@/theme/tokens';

import { Text } from './Text';

/** Order states shown as pills (PRD §4: Received → Ready → Delivered, plus Cancelled). */
export type PillStatus = 'received' | 'ready' | 'delivered' | 'cancelled';

const LOOK: Record<PillStatus, { border: ColorToken; fill?: ColorToken; text: ColorToken }> = {
  received: { border: 'border', text: 'text' },
  ready: { border: 'primary', fill: 'primary', text: 'on-primary' },
  delivered: { border: 'border', text: 'text-muted' },
  cancelled: { border: 'error-subtle', text: 'error' },
};

/** Status pill (DESIGN.md §2 status table, §6.9): always a text label, never colour alone. */
export function StatusPill({ status, testID }: { status: PillStatus; testID?: string }) {
  const colors = useColors();
  const { t } = useTranslation();
  const look = LOOK[status];
  return (
    <View
      testID={testID}
      style={{
        height: 22,
        paddingHorizontal: 8,
        borderRadius: radius.sm,
        borderWidth: 1,
        borderColor: colors[look.border],
        backgroundColor: look.fill ? colors[look.fill] : 'transparent',
        justifyContent: 'center',
        alignSelf: 'flex-start',
      }}
    >
      <Text variant="caption" weight="600" color={look.text} numberOfLines={1}>
        {t(`status.${status}`)}
      </Text>
    </View>
  );
}

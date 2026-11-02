import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { TopBar } from '@/components/ui';
import { useColors } from '@/theme/colors';

/** S13 Orders — empty shell; list arrives in PLAN 7.4. */
export default function OrdersScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar root title={t('orders.title')} />
    </View>
  );
}

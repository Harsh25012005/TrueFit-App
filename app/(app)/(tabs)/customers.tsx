import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { TopBar } from '@/components/ui';
import { useColors } from '@/theme/colors';

/** S14 Customers — empty shell; list arrives in PLAN 4.2. */
export default function CustomersScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar root title={t('customers.title')} />
    </View>
  );
}

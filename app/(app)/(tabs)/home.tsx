import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { EmptyState, TopBar } from '@/components/ui';
import { useColors } from '@/theme/colors';

/** S12 Home — empty shell for Phase 2; "Today" content is PLAN 7.5. */
export default function HomeScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar root title={t('home.title')} />
      <EmptyState icon="home" title={t('home.title')} text={t('home.comingSoon')} />
    </View>
  );
}

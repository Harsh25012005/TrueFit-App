import Constants from 'expo-constants';
import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card, ListRow, SectionHeader, Text, TopBar } from '@/components/ui';
import { useColors } from '@/theme/colors';

/** S15 More — Phase 2 shell with Account; other groups arrive with their features. */
export default function MoreScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar root title={t('more.title')} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 112 }}>
        <SectionHeader title={t('more.account')} />
        <Card variant="list">
          <ListRow title={t('account.title')} onPress={() => router.push('/settings/account')} />
        </Card>
        <Text variant="caption" color="text-muted" style={{ textAlign: 'center', marginTop: 24 }}>
          TrueFit {Constants.expoConfig?.version ?? ''}
        </Text>
      </ScrollView>
    </View>
  );
}

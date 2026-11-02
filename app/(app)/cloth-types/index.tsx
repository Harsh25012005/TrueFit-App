import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  Avatar,
  Button,
  Card,
  EmptyState,
  Input,
  ListRow,
  Sheet,
  SkeletonRows,
  Text,
  TopBar,
} from '@/components/ui';
import { garmentActions, garmentErrorKey, useGarmentList } from '@/features/garments/useGarments';
import { useSessionStore } from '@/stores/session.store';
import { showToast } from '@/stores/ui.store';
import { useColors } from '@/theme/colors';

/** S25 Cloth types (DESIGN.md §7). Works offline: reads and writes the phone's database. */
export default function ClothTypesScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const shopId = useSessionStore((s) => s.shopId);
  const { items, loading } = useGarmentList();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | undefined>();

  function close() {
    setAdding(false);
    setName('');
    setError(undefined);
  }

  function add() {
    if (!shopId) return;
    try {
      const row = garmentActions.addGarment(shopId, { name });
      close();
      showToast({ message: t('garments.saved'), kind: 'success' });
      router.push({ pathname: '/cloth-types/[id]', params: { id: row.id } });
    } catch (e) {
      setError(t(garmentErrorKey(e)));
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar title={t('garments.title')} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 112 }}>
        <Text variant="label" color="text-muted">
          {t('garments.hint')}
        </Text>
        {loading ? (
          <SkeletonRows label={t('common.loading')} count={3} />
        ) : items.length === 0 ? (
          <EmptyState
            icon="ruler"
            title={t('garments.emptyTitle')}
            text={t('garments.emptyText')}
            action={{ label: t('garments.addCloth'), onPress: () => setAdding(true) }}
          />
        ) : (
          <Card variant="list">
            {items.map(({ garment, fieldCount, customerCount }) => (
              <ListRow
                key={garment.id}
                title={garment.name}
                subtitle={t('garments.counts', { fields: fieldCount, customers: customerCount })}
                leading={<Avatar name={garment.name} />}
                onPress={() =>
                  router.push({ pathname: '/cloth-types/[id]', params: { id: garment.id } })
                }
                testID={`garment-${garment.name}`}
              />
            ))}
          </Card>
        )}
        {items.length > 0 ? (
          <Button
            label={t('garments.addCloth')}
            icon="plus"
            variant="secondary"
            fullWidth
            onPress={() => setAdding(true)}
            testID="add-cloth"
          />
        ) : null}
      </ScrollView>

      <Sheet
        visible={adding}
        title={t('garments.newClothTitle')}
        onClose={close}
        dirty={name.length > 0}
        footer={
          <>
            <Button label={t('common.cancel')} variant="secondary" onPress={close} />
            <Button label={t('common.save')} onPress={add} testID="save-cloth" />
          </>
        }
      >
        <Input
          label={t('garments.clothName')}
          value={name}
          onChangeText={(v) => {
            setName(v);
            setError(undefined);
          }}
          maxLength={30}
          returnKeyType="done"
          onSubmitEditing={add}
          error={error}
          testID="cloth-name"
        />
      </Sheet>
    </View>
  );
}

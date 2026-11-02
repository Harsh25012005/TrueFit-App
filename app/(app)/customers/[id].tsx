import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { CustomerSheet } from '@/components/customers/CustomerSheet';
import { HistorySheet } from '@/components/measurements/HistorySheet';
import { MeasurementCard } from '@/components/measurements/MeasurementCard';
import { MeasurementSheet } from '@/components/measurements/MeasurementSheet';
import { Button, Dialog, EmptyState, IconButton, Segmented, Text, TopBar } from '@/components/ui';
import {
  customerActions,
  customerErrorKey,
  useCustomerDetail,
} from '@/features/customers/useCustomers';
import {
  measurementActions,
  measurementErrorKey,
  useCustomerMeasurements,
  type MeasurementCardData,
} from '@/features/measurements/useMeasurements';
import { openCall, openWhatsApp } from '@/features/messages/whatsapp';
import { useMeasurementUnit } from '@/features/shop/useShop';
import { formatMoney } from '@/lib/money';
import { useSessionStore } from '@/stores/session.store';
import { showToast } from '@/stores/ui.store';
import { useColors } from '@/theme/colors';

type Tab = 'measurements' | 'orders';

/** S21 Customer detail (DESIGN.md §7): contact, stats, Measurements / Orders tabs, delete. */
export default function CustomerDetailScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const shopId = useSessionStore((s) => s.shopId) ?? '';
  const unit = useMeasurementUnit();
  const { customer, stats } = useCustomerDetail(id);
  const { cards, garments, fields } = useCustomerMeasurements(id);

  const [tab, setTab] = useState<Tab>('measurements');
  const [editing, setEditing] = useState(false);
  const [measuring, setMeasuring] = useState<{ garmentId?: string } | null>(null);
  const [historyOf, setHistoryOf] = useState<MeasurementCardData | null>(null);
  const [deleteMeasurement, setDeleteMeasurement] = useState<MeasurementCardData | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | undefined>();

  if (!customer) {
    // Deleted, or not loaded yet.
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  const meta = [
    customer.bookNo &&
      t('customers.rowSubtitle', { bookNo: customer.bookNo, phone: customer.phone }),
    !customer.bookNo && customer.phone,
    customer.area,
  ]
    .filter(Boolean)
    .join(' · ');

  function deleteCustomer() {
    setConfirmDelete(false);
    try {
      const deletedId = customer!.id;
      customerActions.deleteCustomer(deletedId);
      showToast({
        message: t('customers.deleted'),
        kind: 'info',
        action: {
          label: t('common.undo'),
          onPress: () => customerActions.restoreCustomer(deletedId),
        },
      });
      router.back();
    } catch (e) {
      setError(t(customerErrorKey(e)));
    }
  }

  function removeMeasurement() {
    const target = deleteMeasurement;
    setDeleteMeasurement(null);
    if (!target) return;
    try {
      measurementActions.deleteMeasurement(target.measurement.id);
    } catch (e) {
      setError(t(measurementErrorKey(e)));
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar
        onBack={() => router.back()}
        actions={[
          <IconButton
            key="edit"
            icon="edit"
            accessibilityLabel={t('customers.editTitle')}
            onPress={() => setEditing(true)}
            testID="edit-customer"
          />,
        ]}
      />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 112 }}>
        <View style={{ gap: 4 }}>
          <Text variant="title-1" accessibilityRole="header" numberOfLines={2}>
            {customer.name}
          </Text>
          <Text color="text-muted">{meta}</Text>
          <Text variant="label" color="text-muted">
            {t('customers.stats', {
              orders: stats.orders,
              active: stats.active,
              due: formatMoney(stats.due),
            })}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1.4 }}>
            <Button
              label={t('customers.newOrder')}
              icon="plus"
              fullWidth
              onPress={() => showToast({ message: t('customers.orderComing'), kind: 'info' })}
              testID="new-order"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label={t('customers.measure')}
              icon="ruler"
              variant="secondary"
              fullWidth
              onPress={() => setMeasuring({})}
              testID="measure"
            />
          </View>
          <IconButton
            icon="phone"
            accessibilityLabel={t('common.call')}
            onPress={() => openCall(customer.phone)}
            testID="call"
          />
          <IconButton
            icon="brand-whatsapp"
            accessibilityLabel={t('common.whatsapp')}
            onPress={() => openWhatsApp(customer.phone)}
            testID="whatsapp"
          />
        </View>

        <Segmented
          accessibilityLabel={t('customers.detailsSection')}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'measurements', label: t('customers.tabMeasurements') },
            { value: 'orders', label: t('customers.tabOrders') },
          ]}
          testID="detail-tabs"
        />

        {tab === 'measurements' ? (
          cards.length === 0 ? (
            <EmptyState
              icon="ruler"
              title={t('measurements.emptyTitle')}
              text={t('measurements.emptyText')}
              action={{ label: t('measurements.take'), onPress: () => setMeasuring({}) }}
            />
          ) : (
            cards.map((card) => (
              <MeasurementCard
                key={card.measurement.id}
                data={card}
                unit={unit}
                onUpdate={() => setMeasuring({ garmentId: card.measurement.garmentTypeId })}
                onHistory={() => setHistoryOf(card)}
                onDelete={() => setDeleteMeasurement(card)}
              />
            ))
          )
        ) : (
          <EmptyState
            icon="receipt"
            title={t('customers.ordersEmptyTitle')}
            text={t('customers.ordersEmptyText')}
          />
        )}

        {error ? (
          <Text variant="caption" color="error" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        <Button
          label={t('customers.delete')}
          icon="trash"
          variant="destructive"
          fullWidth
          onPress={() => setConfirmDelete(true)}
          testID="delete-customer"
        />
      </ScrollView>

      <CustomerSheet
        visible={editing}
        shopId={shopId}
        customer={customer}
        onClose={() => setEditing(false)}
        onSaved={() => undefined}
        onOpenExisting={(otherId) =>
          router.replace({ pathname: '/customers/[id]', params: { id: otherId } })
        }
      />
      <MeasurementSheet
        visible={measuring !== null}
        customerId={customer.id}
        customerName={customer.name}
        garments={garments}
        fields={fields}
        cards={cards}
        unit={unit}
        initialGarmentId={measuring?.garmentId}
        onClose={() => setMeasuring(null)}
        onSaved={(cloth) =>
          showToast({ message: t('measurements.saved', { cloth }), kind: 'success' })
        }
      />
      <HistorySheet
        visible={historyOf !== null}
        card={
          historyOf
            ? (cards.find((c) => c.measurement.id === historyOf.measurement.id) ?? historyOf)
            : null
        }
        unit={unit}
        onClose={() => setHistoryOf(null)}
        onUse={(version) => {
          try {
            measurementActions.restoreVersion(version.id);
            setHistoryOf(null);
            showToast({
              message: t('measurements.saved', { cloth: historyOf?.garmentName ?? '' }),
              kind: 'success',
            });
          } catch (e) {
            setError(t(measurementErrorKey(e)));
            setHistoryOf(null);
          }
        }}
      />
      <Dialog
        visible={confirmDelete}
        title={t('customers.deleteTitle')}
        message={t('customers.deleteText')}
        actions={[{ label: t('common.delete'), variant: 'destructive', onPress: deleteCustomer }]}
        cancelLabel={t('common.cancel')}
        onCancel={() => setConfirmDelete(false)}
      />
      <Dialog
        visible={deleteMeasurement !== null}
        title={t('measurements.deleteTitle')}
        message={t('measurements.deleteText')}
        actions={[
          { label: t('common.delete'), variant: 'destructive', onPress: removeMeasurement },
        ]}
        cancelLabel={t('common.cancel')}
        onCancel={() => setDeleteMeasurement(null)}
      />
    </View>
  );
}

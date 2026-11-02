import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { CustomerSheet } from '@/components/customers/CustomerSheet';
import {
  Avatar,
  Chip,
  EmptyState,
  IconButton,
  ListRow,
  SearchInput,
  SkeletonRows,
  TopBar,
} from '@/components/ui';
import { useCustomerList } from '@/features/customers/useCustomers';
import { formatMoney } from '@/lib/money';
import { useSessionStore } from '@/stores/session.store';
import { useColors } from '@/theme/colors';

/** S14 Customers (DESIGN.md §7): search, All / Has dues chips, one list. Works offline. */
export default function CustomersScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const shopId = useSessionStore((s) => s.shopId) ?? '';
  const [search, setSearch] = useState('');
  const [onlyDues, setOnlyDues] = useState(false);
  const [adding, setAdding] = useState(false);
  const { items, total, dueCount, loading } = useCustomerList(search, onlyDues);

  const open = (id: string) => router.push({ pathname: '/customers/[id]', params: { id } });
  const filtered = search.trim().length > 0 || onlyDues;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar
        root
        title={t('customers.title')}
        actions={[
          <IconButton
            key="add"
            icon="plus"
            accessibilityLabel={t('customers.add')}
            onPress={() => setAdding(true)}
            testID="add-customer"
          />,
        ]}
      />
      <View style={{ paddingHorizontal: 16, gap: 12, paddingBottom: 12 }}>
        <SearchInput
          value={search}
          onChangeText={setSearch}
          placeholder={t('customers.searchPlaceholder')}
          testID="customer-search"
        />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Chip
            label={t('customers.filterAll')}
            count={total}
            selected={!onlyDues}
            onPress={() => setOnlyDues(false)}
            testID="chip-all"
          />
          <Chip
            label={t('customers.filterDues')}
            count={dueCount}
            selected={onlyDues}
            onPress={() => setOnlyDues(true)}
            testID="chip-dues"
          />
        </View>
      </View>

      {loading ? (
        <SkeletonRows label={t('common.loading')} count={5} />
      ) : total === 0 ? (
        <EmptyState
          icon="users"
          title={t('customers.emptyTitle')}
          text={t('customers.emptyText')}
          action={{ label: t('customers.add'), onPress: () => setAdding(true) }}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon="search"
          title={t('customers.noResultsTitle')}
          text={t('customers.noResultsText')}
          action={
            filtered
              ? {
                  label: t('common.clear'),
                  onPress: () => {
                    setSearch('');
                    setOnlyDues(false);
                  },
                }
              : undefined
          }
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.customer.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 112 }}
          style={{ flex: 1 }}
          initialNumToRender={14}
          windowSize={9}
          ItemSeparatorComponent={() => (
            <View style={{ height: 1, backgroundColor: colors['border-subtle'] }} />
          )}
          renderItem={({ item, index }) => {
            const { customer, due } = item;
            const first = index === 0;
            const last = index === items.length - 1;
            return (
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderLeftWidth: 1,
                  borderRightWidth: 1,
                  borderTopWidth: first ? 1 : 0,
                  borderBottomWidth: last ? 1 : 0,
                  borderTopLeftRadius: first ? 4 : 0,
                  borderTopRightRadius: first ? 4 : 0,
                  borderBottomLeftRadius: last ? 4 : 0,
                  borderBottomRightRadius: last ? 4 : 0,
                }}
              >
                <ListRow
                  title={customer.name}
                  subtitle={
                    customer.bookNo
                      ? t('customers.rowSubtitle', {
                          bookNo: customer.bookNo,
                          phone: customer.phone,
                        })
                      : t('customers.rowSubtitleNoBook', { phone: customer.phone })
                  }
                  leading={<Avatar name={customer.name} />}
                  value={due > 0 ? t('customers.due', { amount: formatMoney(due) }) : undefined}
                  onPress={() => open(customer.id)}
                  testID={`customer-${customer.name}`}
                />
              </View>
            );
          }}
        />
      )}

      <CustomerSheet
        visible={adding}
        shopId={shopId}
        onClose={() => setAdding(false)}
        onSaved={(c) => open(c.id)}
        onOpenExisting={open}
      />
    </View>
  );
}

import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

import { db } from '@/db/client';
import type { AppDb } from '@/db/types';
import {
  shopExtrasQuery,
  shopItemsQuery,
  shopOrdersQuery,
  shopPaymentsQuery,
} from '@/features/orders/orders.queries';
import { toAppError } from '@/lib/errors';
import { useSessionStore } from '@/stores/session.store';

import { computeCustomerStats, type CustomerOrderStats } from './customers.dues';
import {
  customerQuery,
  customersQuery,
  customersRepo,
  findByBookNo,
  findDuplicatePhone,
  suggestBookNo,
  type CustomerRow,
} from './customers.repo';

const appDb = db as unknown as AppDb;
const NO_ORDERS: CustomerOrderStats = { orders: 0, active: 0, due: 0 };

/** Orders, active orders and dues for every customer of the shop (live). */
function useCustomerStats(shopId: string) {
  const orders = useLiveQuery(shopOrdersQuery(appDb, shopId), [shopId]);
  const items = useLiveQuery(shopItemsQuery(appDb, shopId), [shopId]);
  const extras = useLiveQuery(shopExtrasQuery(appDb, shopId), [shopId]);
  const payments = useLiveQuery(shopPaymentsQuery(appDb, shopId), [shopId]);
  return useMemo(
    () => computeCustomerStats(orders.data, items.data, extras.data, payments.data),
    [orders.data, items.data, extras.data, payments.data],
  );
}

export interface CustomerListItem {
  customer: CustomerRow;
  due: number;
}

/** S14: customers A–Z, filtered by the search box and the All / Has dues chip. */
export function useCustomerList(search: string, onlyWithDues: boolean) {
  const shopId = useSessionStore((s) => s.shopId) ?? '';
  const rows = useLiveQuery(customersQuery(appDb, shopId, search), [shopId, search]);
  const everyone = useLiveQuery(customersQuery(appDb, shopId), [shopId]);
  const stats = useCustomerStats(shopId);
  const items = useMemo<CustomerListItem[]>(() => {
    const all = rows.data.map((customer) => ({ customer, due: stats.get(customer.id)?.due ?? 0 }));
    return onlyWithDues ? all.filter((i) => i.due > 0) : all;
  }, [rows.data, stats, onlyWithDues]);
  const dueCount = useMemo(
    () => everyone.data.filter((c) => (stats.get(c.id)?.due ?? 0) > 0).length,
    [everyone.data, stats],
  );
  return {
    items,
    total: everyone.data.length,
    dueCount,
    loading: rows.updatedAt === undefined || everyone.updatedAt === undefined,
  };
}

/** S21: one customer with order stats; `customer` is null once deleted. */
export function useCustomerDetail(customerId: string) {
  const shopId = useSessionStore((s) => s.shopId) ?? '';
  const { data, updatedAt } = useLiveQuery(customerQuery(appDb, customerId), [customerId]);
  const stats = useCustomerStats(shopId);
  const row = data[0] ?? null;
  return {
    customer: row && !row.deletedAt ? row : null,
    stats: stats.get(customerId) ?? NO_ORDERS,
    loading: updatedAt === undefined,
  };
}

/** i18n key for a customer error (never raw text). */
export function customerErrorKey(error: unknown): string {
  const err = toAppError(error);
  const reason = typeof err.details?.reason === 'string' ? err.details.reason : '';
  if (reason === 'CUSTOMER_HAS_ACTIVE_ORDERS') return 'customers.errors.hasActiveOrders';
  if (err.code === 'VALIDATION_FAILED') {
    const fields = err.details?.fields as Record<string, string> | undefined;
    const first = fields ? Object.values(fields)[0] : undefined;
    if (first?.startsWith('customers.')) return first;
  }
  return err.messageKey;
}

/** Field-level errors from a failed save: { name: 'customers.errors.name', … }. */
export function customerFieldErrors(error: unknown): Record<string, string> {
  const err = toAppError(error);
  const fields = err.details?.fields as Record<string, string> | undefined;
  return fields ?? {};
}

export const customerActions = customersRepo;

/** Lookups the add/edit form uses while typing (S22): duplicate phone, taken book number, next no. */
export const customerLookups = {
  duplicatePhone: (shopId: string, phone: string, excludeId?: string) =>
    findDuplicatePhone(appDb, shopId, phone, excludeId),
  bookNoOwner: (shopId: string, bookNo: string, excludeId?: string) =>
    findByBookNo(appDb, shopId, bookNo, excludeId),
  nextBookNo: (shopId: string) => suggestBookNo(appDb, shopId),
};

import { and, eq, isNull } from 'drizzle-orm';

import { orderExtras, orderItems, orders, payments } from '@/db/schema';
import type { DbOrTx } from '@/db/types';

/**
 * Read-only queries over a shop's live order data. Used for dues and totals; the full orders
 * repo (create, status, payments) arrives in Phase 6. All exclude soft-deleted rows.
 */
export const shopOrdersQuery = (db: DbOrTx, shopId: string) =>
  db
    .select()
    .from(orders)
    .where(and(eq(orders.shopId, shopId), isNull(orders.deletedAt)));

export const shopItemsQuery = (db: DbOrTx, shopId: string) =>
  db
    .select({ orderId: orderItems.orderId, qty: orderItems.qty, rate: orderItems.rate })
    .from(orderItems)
    .where(and(eq(orderItems.shopId, shopId), isNull(orderItems.deletedAt)));

export const shopExtrasQuery = (db: DbOrTx, shopId: string) =>
  db
    .select({ orderId: orderExtras.orderId, amount: orderExtras.amount })
    .from(orderExtras)
    .where(and(eq(orderExtras.shopId, shopId), isNull(orderExtras.deletedAt)));

export const shopPaymentsQuery = (db: DbOrTx, shopId: string) =>
  db
    .select({ orderId: payments.orderId, amount: payments.amount })
    .from(payments)
    .where(and(eq(payments.shopId, shopId), isNull(payments.deletedAt)));

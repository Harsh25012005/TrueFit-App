import { and, asc, eq, isNull, ne, or, sql } from 'drizzle-orm';

import { db as appDb } from '@/db/client';
import { customers, orders } from '@/db/schema';
import type { AppDb, DbOrTx } from '@/db/types';
import { AppError, toAppError } from '@/lib/errors';
import { newId } from '@/lib/ids';
import { enqueueUpsert } from '@/sync/outbox';

import {
  customerInputSchema,
  customerPatchSchema,
  likePattern,
  nextBookNo,
  type CustomerInput,
  type CustomerPatch,
} from './customers.schema';

export type CustomerRow = typeof customers.$inferSelect;

const blocked = (reason: string) =>
  new AppError('BUSINESS_RULE', reason, { details: { reason }, retryable: false });

function validate<T>(parse: () => T): T {
  try {
    return parse();
  } catch (e) {
    throw toAppError(e);
  }
}

// ─── Reads (query builders, so hooks can run them as live queries) ──────────────────────────

/**
 * Live customers of a shop, A–Z, optionally filtered by name, phone or book number
 * (case-insensitive, any part of the text; works with Gujarati and Hindi text too).
 */
export const customersQuery = (db: DbOrTx, shopId: string, search = '') => {
  const pattern = likePattern(search);
  const where = pattern
    ? and(
        eq(customers.shopId, shopId),
        isNull(customers.deletedAt),
        or(
          sql`lower(${customers.name}) like ${pattern} escape '\\'`,
          sql`${customers.phone} like ${pattern} escape '\\'`,
          sql`lower(coalesce(${customers.bookNo}, '')) like ${pattern} escape '\\'`,
        ),
      )
    : and(eq(customers.shopId, shopId), isNull(customers.deletedAt));
  return db
    .select()
    .from(customers)
    .where(where)
    .orderBy(asc(sql`lower(${customers.name})`));
};

export const customerQuery = (db: DbOrTx, id: string) =>
  db.select().from(customers).where(eq(customers.id, id));

/** Another live customer with this phone (duplicate warning — saving is still allowed, M5). */
export function findDuplicatePhone(
  db: DbOrTx,
  shopId: string,
  phone: string,
  excludeId?: string,
): CustomerRow | null {
  const rows = db
    .select()
    .from(customers)
    .where(
      and(
        eq(customers.shopId, shopId),
        eq(customers.phone, phone),
        isNull(customers.deletedAt),
        excludeId ? ne(customers.id, excludeId) : undefined,
      ),
    )
    .limit(1)
    .all();
  return rows[0] ?? null;
}

/** Book number to prefill in S22: highest numeric + 1 (TESTING.md C4). */
export function suggestBookNo(db: DbOrTx, shopId: string): string {
  const rows = db
    .select({ bookNo: customers.bookNo })
    .from(customers)
    .where(and(eq(customers.shopId, shopId), isNull(customers.deletedAt)))
    .all();
  return nextBookNo(rows.map((r) => r.bookNo));
}

/** The other live customer using this book number, if any (S22 uniqueness hint). */
export function findByBookNo(
  db: DbOrTx,
  shopId: string,
  bookNo: string,
  excludeId?: string,
): CustomerRow | null {
  if (!bookNo.trim()) return null;
  const rows = db
    .select()
    .from(customers)
    .where(
      and(
        eq(customers.shopId, shopId),
        eq(customers.bookNo, bookNo.trim()),
        isNull(customers.deletedAt),
        excludeId ? ne(customers.id, excludeId) : undefined,
      ),
    )
    .limit(1)
    .all();
  return rows[0] ?? null;
}

// ─── Writes: validate → write → enqueue, in one transaction ─────────────────────────────────

function get(tx: DbOrTx, id: string): CustomerRow {
  const row = tx.select().from(customers).where(eq(customers.id, id)).get();
  if (!row) throw new AppError('NOT_FOUND', 'Customer not found');
  return row;
}

function save(tx: DbOrTx, row: CustomerRow) {
  tx.update(customers).set(row).where(eq(customers.id, row.id)).run();
  enqueueUpsert(tx, customers, row.id, row, row.updatedAt);
}

export function createCustomersRepo(db: AppDb, now: () => string = () => new Date().toISOString()) {
  return {
    /** M5: add a customer. Book number defaults to the next free number. */
    addCustomer(shopId: string, input: CustomerInput): CustomerRow {
      const data = validate(() => customerInputSchema.parse(input));
      return db.transaction((tx) => {
        const stamp = now();
        const row: CustomerRow = {
          id: newId(),
          shopId,
          name: data.name,
          phone: data.phone,
          bookNo: data.bookNo ?? suggestBookNo(tx, shopId),
          area: data.area ?? null,
          familyRootId: null,
          createdAt: stamp,
          updatedAt: stamp,
          deletedAt: null,
        };
        tx.insert(customers).values(row).run();
        enqueueUpsert(tx, customers, row.id, row, stamp);
        return row;
      });
    },

    updateCustomer(id: string, patch: CustomerPatch): CustomerRow {
      const data = validate(() => customerPatchSchema.parse(patch));
      return db.transaction((tx) => {
        const current = get(tx, id);
        const next: CustomerRow = {
          ...current,
          ...(data.name !== undefined && { name: data.name }),
          ...(data.phone !== undefined && { phone: data.phone }),
          ...(data.bookNo !== undefined && { bookNo: data.bookNo }),
          ...(data.area !== undefined && { area: data.area }),
          updatedAt: now(),
        };
        save(tx, next);
        return next;
      });
    },

    /**
     * Soft delete (with Undo via restoreCustomer). Blocked while the customer has an order in
     * progress — received or ready and not cancelled (FEATURES.md M5, API.md 5.4).
     */
    deleteCustomer(id: string): void {
      db.transaction((tx) => {
        const current = get(tx, id);
        const active = tx
          .select({ id: orders.id })
          .from(orders)
          .where(
            and(
              eq(orders.customerId, id),
              isNull(orders.deletedAt),
              isNull(orders.cancelledAt),
              ne(orders.status, 'delivered'),
            ),
          )
          .limit(1)
          .all();
        if (active.length > 0) throw blocked('CUSTOMER_HAS_ACTIVE_ORDERS');
        const stamp = now();
        save(tx, { ...current, deletedAt: stamp, updatedAt: stamp });
      });
    },

    /** Undo of a delete (toast action, TESTING.md C5). */
    restoreCustomer(id: string): void {
      db.transaction((tx) => {
        const current = get(tx, id);
        if (current.deletedAt) save(tx, { ...current, deletedAt: null, updatedAt: now() });
      });
    },
  };
}

/** The app's repo, bound to the on-device database. */
export const customersRepo = createCustomersRepo(appDb as unknown as AppDb);

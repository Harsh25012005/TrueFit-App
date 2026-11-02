import { and, asc, eq } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';

import { outbox } from '@/db/schema';
import type { DbOrTx } from '@/db/types';

import { syncTableName, toServerRow } from './tables';

/**
 * Outbox (ARCHITECTURE.md §3.2): every local write adds an entry in the SAME SQLite transaction,
 * so a change is never saved without being queued. The sync engine (Phase 5) pushes the
 * entries in foreign-key order; until then they simply wait. One pending entry per row —
 * a newer write replaces the older payload (upsert by id is idempotent anyway).
 */

export interface OutboxEntry {
  id: number;
  tableName: string;
  rowId: string;
  op: 'upsert';
  payload: Record<string, unknown>;
  attempts: number;
  lastError: string | null;
  createdAt: string;
}

/** Key identifying a row; composite-key tables (measurement_values) join their parts. */
export function rowKey(parts: string | string[]): string {
  return Array.isArray(parts) ? parts.join(':') : parts;
}

/**
 * Queue an upsert of `row` (the full local row, camelCase) for `table`.
 * Call inside the same transaction as the write itself.
 */
export function enqueueUpsert(
  tx: DbOrTx,
  table: SQLiteTable,
  key: string | string[],
  row: Record<string, unknown>,
  now: string = new Date().toISOString(),
): void {
  const tableName = syncTableName(table);
  const id = rowKey(key);
  const payload = JSON.stringify(toServerRow(table, row));

  const pending = tx
    .select({ id: outbox.id })
    .from(outbox)
    .where(and(eq(outbox.tableName, tableName), eq(outbox.rowId, id)))
    .get();

  if (pending) {
    tx.update(outbox)
      .set({ payload, attempts: 0, lastError: null, updatedAt: now })
      .where(eq(outbox.id, pending.id))
      .run();
  } else {
    tx.insert(outbox)
      .values({
        tableName,
        rowId: id,
        op: 'upsert',
        payload,
        attempts: 0,
        lastError: null,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  }
}

export function listOutbox(db: DbOrTx): OutboxEntry[] {
  return db
    .select()
    .from(outbox)
    .orderBy(asc(outbox.createdAt), asc(outbox.id))
    .all()
    .map((r) => ({ ...r, payload: JSON.parse(r.payload) as Record<string, unknown> }));
}

export function pendingCount(db: DbOrTx): number {
  return db.select({ id: outbox.id }).from(outbox).all().length;
}

export function markDone(db: DbOrTx, id: number): void {
  db.delete(outbox).where(eq(outbox.id, id)).run();
}

export function markFailed(db: DbOrTx, id: number, error: string): void {
  const row = db.select().from(outbox).where(eq(outbox.id, id)).get();
  if (!row) return;
  db.update(outbox)
    .set({ attempts: row.attempts + 1, lastError: error, updatedAt: new Date().toISOString() })
    .where(eq(outbox.id, id))
    .run();
}

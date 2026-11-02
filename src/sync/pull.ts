import { and, eq } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';

import { outbox, syncCursors } from '@/db/schema';
import type { AppDb, DbOrTx } from '@/db/types';
import { toAppError } from '@/lib/errors';
import type { TrueFitClient } from '@/lib/supabase';

import { tableFor, toLocalRow, type SyncTableName } from './tables';

/**
 * Pull (ARCHITECTURE.md §3.4, API.md §3.1): rows changed since the stored (updated_at, id)
 * cursor, soft-deleted ones included as tombstones, applied locally in batches of 500.
 * Rows with a change still waiting in the outbox are skipped — the owner's newer offline
 * edit must not be overwritten before it has been pushed.
 *
 * Only the tables listed here are pulled so far; Phase 5 widens it to every synced table.
 */
export const PULL_TABLES: SyncTableName[] = ['garment_types', 'measurement_fields'];
export const PULL_BATCH = 500;

type Row = Record<string, unknown>;

interface Cursor {
  updatedAt: string;
  id: string;
}

/** `+` in a URL filter reads as a space, so send timestamps in `Z` form (keeps microseconds). */
export function toFilterTimestamp(ts: string): string {
  return ts.replace(/\+00(:?00)?$/, 'Z').replace(' ', 'T');
}

function readCursor(db: DbOrTx, table: SyncTableName): Cursor | null {
  const row = db.select().from(syncCursors).where(eq(syncCursors.tableName, table)).get();
  return row ? { updatedAt: row.cursorUpdatedAt, id: row.cursorId } : null;
}

function writeCursor(db: DbOrTx, table: SyncTableName, cursor: Cursor, now: string) {
  db.insert(syncCursors)
    .values({
      tableName: table,
      cursorUpdatedAt: cursor.updatedAt,
      cursorId: cursor.id,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: syncCursors.tableName,
      set: { cursorUpdatedAt: cursor.updatedAt, cursorId: cursor.id, updatedAt: now },
    })
    .run();
}

function hasPendingChange(db: DbOrTx, table: SyncTableName, id: string): boolean {
  return Boolean(
    db
      .select({ id: outbox.id })
      .from(outbox)
      .where(and(eq(outbox.tableName, table), eq(outbox.rowId, id)))
      .get(),
  );
}

/** Applies one batch of server rows locally; returns how many were written. */
export function applyPulledRows(
  db: AppDb,
  table: SyncTableName,
  rows: Row[],
  now: string = new Date().toISOString(),
): number {
  const sqliteTable: SQLiteTable = tableFor(table);
  let written = 0;
  db.transaction((tx) => {
    for (const serverRow of rows) {
      const id = String(serverRow.id);
      if (hasPendingChange(tx, table, id)) continue;
      const local = toLocalRow(sqliteTable, serverRow);
      tx.insert(sqliteTable)
        .values(local as never)
        .onConflictDoUpdate({
          target: (sqliteTable as never as { id: never }).id,
          set: local as never,
        })
        .run();
      written++;
    }
    const last = rows[rows.length - 1];
    if (last) {
      writeCursor(tx, table, { updatedAt: String(last.updated_at), id: String(last.id) }, now);
    }
  });
  return written;
}

/** Pulls one table until the server has nothing newer. Returns the number of rows applied. */
export async function pullTable(
  db: AppDb,
  client: TrueFitClient,
  table: SyncTableName,
  shopId: string,
): Promise<number> {
  let total = 0;
  for (;;) {
    const cursor = readCursor(db, table);
    let query = client.from(table).select('*').eq('shop_id', shopId);
    if (cursor) {
      const ts = toFilterTimestamp(cursor.updatedAt);
      query = query.or(`updated_at.gt.${ts},and(updated_at.eq.${ts},id.gt.${cursor.id})`);
    }
    const { data, error } = await query
      .order('updated_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(PULL_BATCH);
    if (error) throw toAppError(error, { table, op: 'select' });
    const rows = (data ?? []) as Row[];
    total += applyPulledRows(db, table, rows);
    if (rows.length < PULL_BATCH) return total;
  }
}

/** Pull every table in FK order (parents first). */
export async function pullAll(db: AppDb, client: TrueFitClient, shopId: string): Promise<number> {
  let total = 0;
  for (const table of PULL_TABLES) total += await pullTable(db, client, table, shopId);
  return total;
}

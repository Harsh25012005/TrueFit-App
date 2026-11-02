import { getTableColumns, getTableName, type SQL } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';

import * as schema from '@/db/schema';

/**
 * Synced tables in foreign-key order — parents first (ARCHITECTURE.md §3.3, API.md §3).
 * `shops` and `subscriptions` are pulled but never pushed (server-written / one-time create).
 */
export const SYNC_ORDER = [
  'garment_types',
  'measurement_fields',
  'customers',
  'measurements',
  'measurement_values',
  'measurement_versions',
  'orders',
  'order_items',
  'order_extras',
  'payments',
] as const;

export type SyncTableName = (typeof SYNC_ORDER)[number];

const TABLES: Record<SyncTableName, SQLiteTable> = {
  garment_types: schema.garmentTypes,
  measurement_fields: schema.measurementFields,
  customers: schema.customers,
  measurements: schema.measurements,
  measurement_values: schema.measurementValues,
  measurement_versions: schema.measurementVersions,
  orders: schema.orders,
  order_items: schema.orderItems,
  order_extras: schema.orderExtras,
  payments: schema.payments,
};

export function tableFor(name: SyncTableName): SQLiteTable {
  return TABLES[name];
}

export function syncTableName(table: SQLiteTable): SyncTableName {
  const name = getTableName(table) as SyncTableName;
  if (!(name in TABLES)) throw new Error(`${name} is not a synced table`);
  return name;
}

type Row = Record<string, unknown>;

/** Local (camelCase property) row → server row (snake_case column names) for push. */
export function toServerRow(table: SQLiteTable, row: Row): Row {
  const out: Row = {};
  for (const [prop, column] of Object.entries(getTableColumns(table))) {
    if (prop in row) out[column.name] = row[prop];
  }
  return out;
}

/** Server row (snake_case) → local row (camelCase properties) for pull. */
export function toLocalRow(table: SQLiteTable, row: Row): Row {
  const out: Row = {};
  for (const [prop, column] of Object.entries(getTableColumns(table))) {
    if (column.name in row) out[prop] = row[column.name];
  }
  return out;
}

export type { SQL };

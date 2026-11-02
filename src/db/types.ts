import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import type * as schema from './schema';

/**
 * The Drizzle SQLite database every repo works against. Both expo-sqlite (the app) and
 * better-sqlite3 (Jest) are synchronous, so repos are written once and tested for real.
 */
export type AppDb = BaseSQLiteDatabase<'sync', unknown, typeof schema>;

/** A transaction handle has the same query API as the database. */
export type AppTx = Parameters<Parameters<AppDb['transaction']>[0]>[0];

/** Either; repo helpers accept both so they can run inside or outside a transaction. */
export type DbOrTx = AppDb | AppTx;

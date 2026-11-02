import { drizzle } from 'drizzle-orm/expo-sqlite';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { openDatabaseSync } from 'expo-sqlite';

import migrations from './migrations/migrations';
import * as schema from './schema';
import { WIPE_ORDER } from './schema';

/** One SQLite file per install. Wiped on sign-out (AUTH_SECURITY.md §2, PLAN 2.11). */
export const DB_NAME = 'truefit.db';

/** Raw expo-sqlite handle; live queries need the change listener. */
export const sqlite = openDatabaseSync(DB_NAME, { enableChangeListener: true });
sqlite.execSync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');

/** Typed Drizzle client. Screens never use it directly — only feature repos do. */
export const db = drizzle(sqlite, { schema });
export type Db = typeof db;

/**
 * Sign-out wipes the shop data from this phone (AUTH_SECURITY.md §2: shared phones must not keep
 * it). This is the device cache only — everything stays in the owner's cloud account.
 */
export async function wipeLocalData(): Promise<void> {
  await sqlite.withTransactionAsync(async () => {
    for (const table of WIPE_ORDER) await sqlite.execAsync(`DELETE FROM ${table};`);
  });
}

/** Runs pending device migrations once at startup; `success` gates the app shell. */
export function useDeviceMigrations() {
  return useMigrations(db, migrations);
}

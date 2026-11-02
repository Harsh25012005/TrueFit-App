/** Jest-only helper: a real in-memory SQLite with the device migrations, wrapped in Drizzle. */
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';

import journal from './migrations/meta/_journal.json';
import * as schema from './schema';
import type { AppDb } from './types';

export function createTestDb(): { db: AppDb; raw: Database.Database } {
  const raw = new Database(':memory:');
  raw.pragma('foreign_keys = ON');
  for (const entry of journal.entries) {
    const sql = readFileSync(join(__dirname, 'migrations', `${entry.tag}.sql`), 'utf8');
    for (const statement of sql.split('--> statement-breakpoint')) raw.exec(statement);
  }
  return { db: drizzle(raw, { schema }) as unknown as AppDb, raw };
}

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';

import journal from './migrations/meta/_journal.json';
import { WIPE_ORDER } from './schema';

/** Applies the generated device migrations to an in-memory SQLite, like the app does on launch. */
function migratedDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  for (const entry of journal.entries) {
    const sql = readFileSync(join(__dirname, 'migrations', `${entry.tag}.sql`), 'utf8');
    for (const statement of sql.split('--> statement-breakpoint')) db.exec(statement);
  }
  return db;
}

const now = '2026-11-02T10:00:00.000Z';
const ts = { created_at: now, updated_at: now };

function insert(db: Database.Database, table: string, row: Record<string, unknown>) {
  const cols = Object.keys(row);
  db.prepare(
    `insert into ${table} (${cols.join(', ')}) values (${cols.map((c) => `@${c}`).join(', ')})`,
  ).run(row);
}

describe('device SQLite schema (DATABASE.md §2 mirror)', () => {
  it('creates every MVP table plus outbox and sync_cursors', () => {
    const db = migratedDb();
    const tables = db
      .prepare(`select name from sqlite_master where type = 'table' and name not like 'sqlite_%'`)
      .all()
      .map((r) => (r as { name: string }).name)
      .sort();
    expect(tables).toEqual(
      [
        'customers',
        'garment_types',
        'measurement_fields',
        'measurement_values',
        'measurement_versions',
        'measurements',
        'order_extras',
        'order_items',
        'orders',
        'outbox',
        'payments',
        'profiles',
        'shops',
        'subscriptions',
        'sync_cursors',
      ].sort(),
    );
  });

  it('sign-out wipe covers every table in a foreign-key-safe order', () => {
    const db = migratedDb();
    const tables = db
      .prepare(
        `select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name not like '__drizzle%'`,
      )
      .all()
      .map((r) => (r as { name: string }).name);
    expect([...WIPE_ORDER].sort()).toEqual(tables.sort());
    insert(db, 'customers', { id: 'c1', shop_id: 's1', name: 'Amit', phone: '9824012345', ...ts });
    insert(db, 'garment_types', { id: 'g1', shop_id: 's1', name: 'Shirt', ...ts });
    insert(db, 'orders', {
      id: 'o1',
      shop_id: 's1',
      customer_id: 'c1',
      order_no: 1,
      order_date: '2026-11-01',
      due_date: '2026-11-02',
      ...ts,
    });
    insert(db, 'order_items', {
      id: 'i1',
      shop_id: 's1',
      order_id: 'o1',
      garment_type_id: 'g1',
      qty: 1,
      rate: 1,
      ...ts,
    });
    expect(() => {
      for (const table of WIPE_ORDER) db.exec(`delete from ${table}`);
    }).not.toThrow();
  });

  describe('constraints match the server', () => {
    const db = migratedDb();
    insert(db, 'customers', { id: 'c1', shop_id: 's1', name: 'Amit', phone: '9824012345', ...ts });
    insert(db, 'garment_types', { id: 'g1', shop_id: 's1', name: 'Shirt', ...ts });
    insert(db, 'orders', {
      id: 'o1',
      shop_id: 's1',
      customer_id: 'c1',
      order_no: 1001,
      order_date: '2026-11-01',
      due_date: '2026-11-08',
      ...ts,
    });

    const item = (qty: number, rate: number) => () =>
      insert(db, 'order_items', {
        id: `i-${qty}-${rate}`,
        shop_id: 's1',
        order_id: 'o1',
        garment_type_id: 'g1',
        qty,
        rate,
        ...ts,
      });

    it('order item qty 1–50 and rate 0–2,00,000', () => {
      expect(item(2, 650)).not.toThrow();
      expect(item(0, 650)).toThrow(/CHECK constraint failed/);
      expect(item(51, 650)).toThrow(/CHECK constraint failed/);
      expect(item(1, 200001)).toThrow(/CHECK constraint failed/);
    });

    it('due date cannot be before the order date', () => {
      expect(() =>
        insert(db, 'orders', {
          id: 'o2',
          shop_id: 's1',
          customer_id: 'c1',
          order_no: 1002,
          order_date: '2026-11-08',
          due_date: '2026-11-01',
          ...ts,
        }),
      ).toThrow(/CHECK constraint failed/);
    });

    it('delivered_on is set exactly when status is delivered', () => {
      expect(() =>
        db.prepare(`update orders set status = 'delivered' where id = 'o1'`).run(),
      ).toThrow(/CHECK constraint failed/);
      expect(() =>
        db
          .prepare(
            `update orders set status = 'delivered', delivered_on = '2026-11-02' where id = 'o1'`,
          )
          .run(),
      ).not.toThrow();
    });

    it('status and payment mode only accept enum values', () => {
      expect(() => db.prepare(`update orders set status = 'lost' where id = 'o1'`).run()).toThrow(
        /CHECK constraint failed/,
      );
      const pay = (amount: number, mode: string) => () =>
        insert(db, 'payments', {
          id: `p-${amount}-${mode}`,
          shop_id: 's1',
          order_id: 'o1',
          amount,
          mode,
          paid_on: '2026-11-02',
          ...ts,
        });
      expect(pay(400, 'upi')).not.toThrow();
      expect(pay(-100, 'cash')).not.toThrow(); // refund
      expect(pay(0, 'cash')).toThrow(/CHECK constraint failed/);
      expect(pay(100, 'cheque')).toThrow(/CHECK constraint failed/);
    });

    it('one current measurement per customer per cloth (soft-deleted ones do not count)', () => {
      const m = (id: string, deletedAt: string | null) => () =>
        insert(db, 'measurements', {
          id,
          shop_id: 's1',
          customer_id: 'c1',
          garment_type_id: 'g1',
          measured_on: '2026-11-02',
          deleted_at: deletedAt,
          ...ts,
        });
      expect(m('m1', null)).not.toThrow();
      expect(m('m2', null)).toThrow(/UNIQUE constraint failed/);
      expect(m('m3', now)).not.toThrow();
    });

    it('cloth names are unique per shop, case-insensitive', () => {
      expect(() =>
        insert(db, 'garment_types', { id: 'g2', shop_id: 's1', name: 'SHIRT', ...ts }),
      ).toThrow(/UNIQUE constraint failed/);
      expect(() =>
        insert(db, 'garment_types', { id: 'g3', shop_id: 's2', name: 'Shirt', ...ts }),
      ).not.toThrow();
    });

    it('measurement values stay within 0–999.99 inches', () => {
      insert(db, 'measurement_fields', {
        id: 'f1',
        shop_id: 's1',
        garment_type_id: 'g1',
        name: 'Chest',
        ...ts,
      });
      const v = (value: number) => () =>
        db
          .prepare(
            `insert or replace into measurement_values (measurement_id, field_id, shop_id, value_in, created_at, updated_at)
             values ('m1', 'f1', 's1', ?, ?, ?)`,
          )
          .run(value, now, now);
      expect(v(40.5)).not.toThrow();
      expect(v(0)).toThrow(/CHECK constraint failed/);
      expect(v(1000)).toThrow(/CHECK constraint failed/);
    });

    it('order numbers are not unique on the device (offline provisional numbers)', () => {
      expect(() =>
        insert(db, 'orders', {
          id: 'o3',
          shop_id: 's1',
          customer_id: 'c1',
          order_no: 1001,
          order_date: '2026-11-01',
          due_date: '2026-11-08',
          ...ts,
        }),
      ).not.toThrow();
    });
  });
});

import { garmentTypes, shops } from '@/db/schema';
import { createTestDb } from '@/db/testing';

import { enqueueUpsert, listOutbox, markDone, markFailed, pendingCount } from './outbox';
import { syncTableName, toLocalRow, toServerRow, SYNC_ORDER } from './tables';

const ts = '2026-11-02T10:00:00.000Z';
const garment = (id: string, name: string) => ({
  id,
  shopId: 's1',
  name,
  sortOrder: 0,
  styleOptions: {},
  fabricPerPieceM: 0,
  createdAt: ts,
  updatedAt: ts,
  deletedAt: null,
});

describe('outbox (ARCHITECTURE.md §3.2)', () => {
  it('stores the server-shaped payload (snake_case) for the row', () => {
    const { db } = createTestDb();
    db.transaction((tx) => {
      const row = garment('g1', 'Shirt');
      tx.insert(garmentTypes).values(row).run();
      enqueueUpsert(tx, garmentTypes, 'g1', row, ts);
    });
    const [entry] = listOutbox(db);
    expect(entry).toMatchObject({
      tableName: 'garment_types',
      rowId: 'g1',
      op: 'upsert',
      attempts: 0,
    });
    expect(entry?.payload).toEqual({
      id: 'g1',
      shop_id: 's1',
      name: 'Shirt',
      sort_order: 0,
      style_options: {},
      fabric_per_piece_m: 0,
      created_at: ts,
      updated_at: ts,
      deleted_at: null,
    });
  });

  it('never leaves a half-write: a failing transaction saves neither the row nor the entry', () => {
    const { db } = createTestDb();
    expect(() =>
      db.transaction((tx) => {
        const row = garment('g1', 'Shirt');
        tx.insert(garmentTypes).values(row).run();
        enqueueUpsert(tx, garmentTypes, 'g1', row, ts);
        throw new Error('boom after queueing');
      }),
    ).toThrow('boom');
    expect(pendingCount(db)).toBe(0);
    expect(db.select().from(garmentTypes).all()).toEqual([]);
  });

  it('keeps one entry per row, tracks failures, and removes done entries', () => {
    const { db } = createTestDb();
    db.transaction((tx) => {
      enqueueUpsert(tx, garmentTypes, 'g1', garment('g1', 'A'), ts);
      enqueueUpsert(tx, garmentTypes, 'g1', garment('g1', 'B'), ts);
      enqueueUpsert(tx, garmentTypes, 'g2', garment('g2', 'C'), ts);
    });
    const entries = listOutbox(db);
    expect(entries.map((e) => [e.rowId, e.payload.name])).toEqual([
      ['g1', 'B'],
      ['g2', 'C'],
    ]);
    markFailed(db, entries[0]!.id, 'offline');
    expect(listOutbox(db)[0]).toMatchObject({ attempts: 1, lastError: 'offline' });
    markDone(db, entries[0]!.id);
    expect(pendingCount(db)).toBe(1);
  });

  it('refuses tables that are never pushed', () => {
    const { db } = createTestDb();
    expect(() => db.transaction((tx) => enqueueUpsert(tx, shops, 's', {}, ts))).toThrow(
      /not a synced table/,
    );
  });
});

describe('sync table maps', () => {
  it('lists parents before children (FK order)', () => {
    const order = [...SYNC_ORDER];
    expect(order.indexOf('garment_types')).toBeLessThan(order.indexOf('measurement_fields'));
    expect(order.indexOf('customers')).toBeLessThan(order.indexOf('measurements'));
    expect(order.indexOf('orders')).toBeLessThan(order.indexOf('order_items'));
    expect(order.indexOf('orders')).toBeLessThan(order.indexOf('payments'));
  });

  it('maps rows both ways without losing a column', () => {
    const local = garment('g1', 'Shirt');
    const server = toServerRow(garmentTypes, local);
    expect(Object.keys(server)).toHaveLength(Object.keys(local).length);
    expect(toLocalRow(garmentTypes, server)).toEqual(local);
    expect(syncTableName(garmentTypes)).toBe('garment_types');
  });
});

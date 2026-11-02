import { garmentTypes, measurementFields } from '@/db/schema';
import { createTestDb } from '@/db/testing';
import type { TrueFitClient } from '@/lib/supabase';

import { enqueueUpsert, listOutbox } from './outbox';
import { PULL_BATCH, pullAll, pullTable, toFilterTimestamp } from './pull';

type Row = Record<string, unknown>;

/** Minimal PostgREST double: filters server rows by the cursor and records the calls. */
function fakeClient(server: Record<string, Row[]>) {
  const calls: { table: string; or?: string }[] = [];
  const client = {
    from(table: string) {
      const call: { table: string; or?: string } = { table };
      calls.push(call);
      let rows = [...(server[table] ?? [])];
      const chain = {
        select: () => chain,
        eq: (col: string, value: unknown) => {
          rows = rows.filter((r) => r[col] === value);
          return chain;
        },
        or: (expr: string) => {
          call.or = expr;
          const m = /updated_at\.gt\.(.+?),and\(updated_at\.eq\.(.+?),id\.gt\.(.+)\)/.exec(expr);
          if (m) {
            const [, ts, , id] = m;
            rows = rows.filter(
              (r) =>
                String(r.updated_at) > ts! || (String(r.updated_at) === ts && String(r.id) > id!),
            );
          }
          return chain;
        },
        order: () => chain,
        limit: (n: number) => Promise.resolve({ data: rows.slice(0, n), error: null }),
      };
      return chain;
    },
  };
  return { client: client as unknown as TrueFitClient, calls };
}

const garment = (id: string, name: string, updated: string, extra: Row = {}): Row => ({
  id,
  shop_id: 's1',
  name,
  sort_order: 0,
  style_options: {},
  fabric_per_piece_m: 1.6,
  created_at: updated,
  updated_at: updated,
  deleted_at: null,
  ...extra,
});

describe('pull (API.md §3.1)', () => {
  it('3.4: rows from create_shop appear on the device', async () => {
    const { db } = createTestDb();
    const { client } = fakeClient({
      garment_types: [
        garment('g1', 'Shirt', '2026-11-02T08:00:00.100000Z'),
        garment('g2', 'Pant', '2026-11-02T08:00:00.100000Z'),
      ],
      measurement_fields: [
        {
          id: 'f1',
          shop_id: 's1',
          garment_type_id: 'g1',
          name: 'Length',
          sort_order: 0,
          created_at: '2026-11-02T08:00:00.200000Z',
          updated_at: '2026-11-02T08:00:00.200000Z',
          deleted_at: null,
        },
      ],
    });
    expect(await pullAll(db, client, 's1')).toBe(3);
    expect(
      db
        .select()
        .from(garmentTypes)
        .all()
        .map((g) => g.name)
        .sort(),
    ).toEqual(['Pant', 'Shirt']);
    expect(db.select().from(measurementFields).all()).toHaveLength(1);
    expect(db.select().from(garmentTypes).all()[0]?.styleOptions).toEqual({});
  });

  it('only asks for rows after the cursor next time, and is idempotent', async () => {
    const { db } = createTestDb();
    const server = { garment_types: [garment('g1', 'Shirt', '2026-11-02T08:00:00.100000+00:00')] };
    const { client, calls } = fakeClient(server);
    await pullTable(db, client, 'garment_types', 's1');
    expect(calls[0]?.or).toBeUndefined();

    await pullTable(db, client, 'garment_types', 's1');
    // `+00:00` is sent as `Z`: a raw plus sign would be read as a space in the URL.
    expect(calls[1]?.or).toBe(
      'updated_at.gt.2026-11-02T08:00:00.100000Z,and(updated_at.eq.2026-11-02T08:00:00.100000Z,id.gt.g1)',
    );
    expect(db.select().from(garmentTypes).all()).toHaveLength(1);
  });

  it('S3: a row soft-deleted on the server becomes a tombstone locally', async () => {
    const { db } = createTestDb();
    const server = { garment_types: [garment('g1', 'Shirt', '2026-11-02T08:00:00.100000Z')] };
    const { client } = fakeClient(server);
    await pullTable(db, client, 'garment_types', 's1');
    server.garment_types = [
      garment('g1', 'Shirt', '2026-11-02T09:00:00.000000Z', {
        deleted_at: '2026-11-02T09:00:00.000000Z',
      }),
    ];
    await pullTable(db, client, 'garment_types', 's1');
    expect(db.select().from(garmentTypes).all()[0]?.deletedAt).toBe('2026-11-02T09:00:00.000000Z');
  });

  it('does not overwrite a row that still has an unsent local change', async () => {
    const { db } = createTestDb();
    const local = {
      id: 'g1',
      shopId: 's1',
      name: 'My newer name',
      sortOrder: 0,
      styleOptions: {},
      fabricPerPieceM: 0,
      createdAt: '2026-11-02T07:00:00.000Z',
      updatedAt: '2026-11-02T07:00:00.000Z',
      deletedAt: null,
    };
    db.transaction((tx) => {
      tx.insert(garmentTypes).values(local).run();
      enqueueUpsert(tx, garmentTypes, 'g1', local);
    });
    const { client } = fakeClient({
      garment_types: [garment('g1', 'Server name', '2026-11-02T08:00:00.000000Z')],
    });
    await pullTable(db, client, 'garment_types', 's1');
    expect(db.select().from(garmentTypes).all()[0]?.name).toBe('My newer name');
    expect(listOutbox(db)).toHaveLength(1);
  });

  it('keeps pulling while batches come back full', async () => {
    const { db } = createTestDb();
    const rows = Array.from({ length: PULL_BATCH + 5 }, (_, i) =>
      garment(`g${String(i).padStart(4, '0')}`, `Cloth ${i}`, '2026-11-02T08:00:00.000000Z'),
    );
    const { client, calls } = fakeClient({ garment_types: rows });
    expect(await pullTable(db, client, 'garment_types', 's1')).toBe(PULL_BATCH + 5);
    expect(calls).toHaveLength(2);
  });

  it('converts timestamps for filters', () => {
    expect(toFilterTimestamp('2026-11-02T08:00:00.123456+00:00')).toBe(
      '2026-11-02T08:00:00.123456Z',
    );
    expect(toFilterTimestamp('2026-11-02 08:00:00+00')).toBe('2026-11-02T08:00:00Z');
    expect(toFilterTimestamp('2026-11-02T08:00:00Z')).toBe('2026-11-02T08:00:00Z');
  });
});

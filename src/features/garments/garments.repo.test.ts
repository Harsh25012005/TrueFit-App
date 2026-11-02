import { randomUUID, randomUUID as mockUuid } from 'crypto';

import { createTestDb } from '@/db/testing';
import { listOutbox } from '@/sync/outbox';

import { createGarmentsRepo, fieldsQuery, garmentsQuery } from './garments.repo';
import { formatStyleText, parseStyleText } from './garments.schema';

// The repo module also exports an app-bound instance; keep it off the real SQLite and expo-crypto.
jest.mock('@/db/client', () => ({ db: {} }));
jest.mock('@/lib/ids', () => ({ newId: () => mockUuid() }));

const SHOP = 'shop-1';
let clock = 0;
const now = () => new Date(Date.UTC(2026, 10, 2, 10, 0, clock++)).toISOString();

function setup() {
  const { db, raw } = createTestDb();
  return { db, raw, repo: createGarmentsRepo(db, now) };
}

const liveNames = (db: ReturnType<typeof setup>['db']) =>
  garmentsQuery(db, SHOP)
    .all()
    .map((g) => g.name);

describe('garments repo — cloth types (M4)', () => {
  it('adds a cloth type at the end and queues it in the outbox (G2)', () => {
    const { db, repo } = setup();
    repo.addGarment(SHOP, { name: 'Shirt' });
    const kurta = repo.addGarment(SHOP, {
      name: '  Kurta  ',
      fabricPerPieceM: 2.5,
      styleOptions: { Neck: ['Round', 'V'] },
    });
    expect(kurta).toMatchObject({ name: 'Kurta', sortOrder: 1, fabricPerPieceM: 2.5 });
    expect(liveNames(db)).toEqual(['Shirt', 'Kurta']);

    const queued = listOutbox(db).filter((e) => e.tableName === 'garment_types');
    expect(queued.map((e) => e.rowId)).toHaveLength(2);
    expect(queued[1]?.payload).toMatchObject({
      id: kurta.id,
      shop_id: SHOP,
      name: 'Kurta',
      sort_order: 1,
      fabric_per_piece_m: 2.5,
      style_options: { Neck: ['Round', 'V'] },
    });
  });

  it('G1: rejects a duplicate name, ignoring case, but allows it in another shop', () => {
    const { repo } = setup();
    repo.addGarment(SHOP, { name: 'Shirt' });
    expect(() => repo.addGarment(SHOP, { name: 'shirt' })).toThrow(
      expect.objectContaining({
        code: 'CONFLICT',
        details: { reason: 'duplicate_name', field: 'name' },
      }),
    );
    expect(() => repo.addGarment('shop-2', { name: 'SHIRT' })).not.toThrow();
  });

  it('validates name length 2–30 and fabric 0–20 with one decimal', () => {
    const { repo } = setup();
    for (const name of ['A', ' ', 'x'.repeat(31)]) {
      expect(() => repo.addGarment(SHOP, { name })).toThrow(
        expect.objectContaining({ code: 'VALIDATION_FAILED' }),
      );
    }
    expect(() => repo.addGarment(SHOP, { name: 'Coat', fabricPerPieceM: 21 })).toThrow();
    expect(() => repo.addGarment(SHOP, { name: 'Coat', fabricPerPieceM: 1.55 })).toThrow();
    expect(() => repo.addGarment(SHOP, { name: 'Coat', fabricPerPieceM: 1.5 })).not.toThrow();
  });

  it('renames a cloth; its id (and so every order and measurement) stays the same', () => {
    const { db, repo } = setup();
    const shirt = repo.addGarment(SHOP, { name: 'Shirt' });
    repo.addGarment(SHOP, { name: 'Pant' });
    const renamed = repo.updateGarment(shirt.id, { name: 'Formal shirt' });
    expect(renamed.id).toBe(shirt.id);
    expect(liveNames(db)).toEqual(['Formal shirt', 'Pant']);
    expect(() => repo.updateGarment(shirt.id, { name: 'pant' })).toThrow(
      expect.objectContaining({ code: 'CONFLICT' }),
    );
    // Renaming to its own name in a different case is allowed.
    expect(() => repo.updateGarment(shirt.id, { name: 'FORMAL SHIRT' })).not.toThrow();
  });

  it('a partial update leaves the other fields alone (regression: .partial() kept zod defaults)', () => {
    const { repo } = setup();
    const kurta = repo.addGarment(SHOP, {
      name: 'Kurta',
      fabricPerPieceM: 2.5,
      styleOptions: { Neck: ['V'] },
    });
    const renamed = repo.updateGarment(kurta.id, { name: 'Long kurta' });
    expect(renamed).toMatchObject({ fabricPerPieceM: 2.5, styleOptions: { Neck: ['V'] } });
    expect(repo.updateGarment(kurta.id, { fabricPerPieceM: 3 })).toMatchObject({
      name: 'Long kurta',
      styleOptions: { Neck: ['V'] },
    });
  });

  it('keeps one outbox entry per row; a newer write replaces the payload', () => {
    const { db, repo } = setup();
    const shirt = repo.addGarment(SHOP, { name: 'Shirt' });
    repo.updateGarment(shirt.id, { name: 'Shirt 2' });
    repo.updateGarment(shirt.id, { name: 'Shirt 3' });
    const entries = listOutbox(db).filter((e) => e.rowId === shirt.id);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.payload).toMatchObject({ name: 'Shirt 3' });
  });

  it('soft-deletes a cloth and its fields (rows stay, as tombstones, and are queued)', () => {
    const { db, raw, repo } = setup();
    const shirt = repo.addGarment(SHOP, { name: 'Shirt' });
    const chest = repo.addField(shirt.id, 'Chest');
    repo.deleteGarment(shirt.id);
    expect(liveNames(db)).toEqual([]);
    expect(fieldsQuery(db, SHOP).all()).toEqual([]);
    expect(raw.prepare('select count(*) n from garment_types').get()).toEqual({ n: 1 });
    expect(
      raw.prepare('select deleted_at from measurement_fields where id = ?').get(chest.id),
    ).toEqual({
      deleted_at: expect.any(String),
    });
    const queued = listOutbox(db).find((e) => e.rowId === shirt.id);
    expect(queued?.payload.deleted_at).toEqual(expect.any(String));
  });

  describe('G3: deleting a cloth used by an active order', () => {
    function withOrder(status: 'received' | 'ready' | 'delivered', cancelled: boolean) {
      const ctx = setup();
      const shirt = ctx.repo.addGarment(SHOP, { name: 'Shirt' });
      const ts = '2026-11-02T10:00:00.000Z';
      const customer = randomUUID();
      const order = randomUUID();
      ctx.raw
        .prepare(
          `insert into customers (id, shop_id, name, phone, created_at, updated_at) values (?, ?, 'Amit', '9824012345', ?, ?)`,
        )
        .run(customer, SHOP, ts, ts);
      ctx.raw
        .prepare(
          `insert into orders (id, shop_id, customer_id, order_no, status, order_date, due_date, delivered_on, cancelled_at, created_at, updated_at)
           values (?, ?, ?, 1001, ?, '2026-11-01', '2026-11-08', ?, ?, ?, ?)`,
        )
        .run(
          order,
          SHOP,
          customer,
          status,
          status === 'delivered' ? '2026-11-02' : null,
          cancelled ? ts : null,
          ts,
          ts,
        );
      ctx.raw
        .prepare(
          `insert into order_items (id, shop_id, order_id, garment_type_id, qty, rate, created_at, updated_at) values (?, ?, ?, ?, 1, 500, ?, ?)`,
        )
        .run(randomUUID(), SHOP, order, shirt.id, ts, ts);
      return { ...ctx, shirt };
    }

    it.each(['received', 'ready'] as const)('is blocked while an order is %s', (status) => {
      const { repo, shirt, db } = withOrder(status, false);
      expect(() => repo.deleteGarment(shirt.id)).toThrow(
        expect.objectContaining({ code: 'BUSINESS_RULE', details: { reason: 'GARMENT_IN_USE' } }),
      );
      expect(liveNames(db)).toEqual(['Shirt']);
    });

    it('is allowed once the order is delivered or cancelled', () => {
      const delivered = withOrder('delivered', false);
      expect(() => delivered.repo.deleteGarment(delivered.shirt.id)).not.toThrow();
      const cancelled = withOrder('received', true);
      expect(() => cancelled.repo.deleteGarment(cancelled.shirt.id)).not.toThrow();
    });
  });
});

describe('garments repo — measurement fields (M4)', () => {
  it('adds fields in order; rename keeps the id; duplicates and the 30-field cap are refused', () => {
    const { db, repo } = setup();
    const shirt = repo.addGarment(SHOP, { name: 'Shirt' });
    const length = repo.addField(shirt.id, 'Length');
    repo.addField(shirt.id, 'Chest');
    expect(() => repo.addField(shirt.id, 'chest')).toThrow(
      expect.objectContaining({ code: 'CONFLICT' }),
    );
    expect(() => repo.addField(shirt.id, '')).toThrow(
      expect.objectContaining({ code: 'VALIDATION_FAILED' }),
    );

    const renamed = repo.renameField(length.id, 'Chest round'.slice(0, 5) + ' 2');
    expect(renamed.id).toBe(length.id);

    for (let i = 3; i <= 30; i++) repo.addField(shirt.id, `F${i}`);
    expect(() => repo.addField(shirt.id, 'One more')).toThrow(
      expect.objectContaining({ code: 'BUSINESS_RULE', details: { reason: 'TOO_MANY_FIELDS' } }),
    );
    expect(fieldsQuery(db, SHOP).all()).toHaveLength(30);
  });

  it('G2: ↑↓ reorder swaps neighbours, queues the changed rows, and stops at the ends', () => {
    const { db, repo } = setup();
    const shirt = repo.addGarment(SHOP, { name: 'Shirt' });
    const [a, b, c] = ['Length', 'Chest', 'Waist'].map((n) => repo.addField(shirt.id, n));
    const order = () =>
      fieldsQuery(db, SHOP)
        .all()
        .map((f) => f.name);

    repo.moveField(c!.id, 'up');
    expect(order()).toEqual(['Length', 'Waist', 'Chest']);
    repo.moveField(a!.id, 'up'); // already first
    repo.moveField(b!.id, 'down'); // already last
    expect(order()).toEqual(['Length', 'Waist', 'Chest']);

    const payloads = Object.fromEntries(
      listOutbox(db)
        .filter((e) => e.tableName === 'measurement_fields')
        .map((e) => [e.rowId, e.payload.sort_order]),
    );
    expect(payloads).toEqual({ [a!.id]: 0, [b!.id]: 2, [c!.id]: 1 });
  });

  it('soft-deletes a field; its name can be reused afterwards', () => {
    const { db, repo } = setup();
    const shirt = repo.addGarment(SHOP, { name: 'Shirt' });
    const cuff = repo.addField(shirt.id, 'Cuff');
    repo.deleteField(cuff.id);
    expect(fieldsQuery(db, SHOP).all()).toEqual([]);
    expect(() => repo.addField(shirt.id, 'Cuff')).not.toThrow();
    expect(() => repo.renameField(cuff.id, 'X')).toThrow(
      expect.objectContaining({ code: 'NOT_FOUND' }),
    );
  });
});

describe('style option text', () => {
  it('round-trips and ignores junk lines', () => {
    const text = 'Collar: Regular, Mandarin\n\nnonsense\nFit:Slim ,\nEmpty:   ';
    expect(parseStyleText(text)).toEqual({ Collar: ['Regular', 'Mandarin'], Fit: ['Slim'] });
    expect(formatStyleText({ Collar: ['Regular', 'Mandarin'] })).toBe('Collar: Regular, Mandarin');
  });
});

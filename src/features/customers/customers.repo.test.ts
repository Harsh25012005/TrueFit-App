import { randomUUID, randomUUID as mockUuid } from 'crypto';

import { createTestDb } from '@/db/testing';
import { listOutbox } from '@/sync/outbox';

import { computeOrderMoney } from '../orders/orderTotals';
import { computeCustomerStats } from './customers.dues';
import {
  findByBookNo,
  createCustomersRepo,
  customersQuery,
  findDuplicatePhone,
  suggestBookNo,
} from './customers.repo';
import { likePattern, nextBookNo } from './customers.schema';

jest.mock('@/db/client', () => ({ db: {} }));
jest.mock('@/lib/ids', () => ({ newId: () => mockUuid() }));

const SHOP = 'shop-1';
let clock = 0;
const now = () => new Date(Date.UTC(2026, 10, 2, 10, 0, clock++)).toISOString();

function setup() {
  const { db, raw } = createTestDb();
  return { db, raw, repo: createCustomersRepo(db, now) };
}
const names = (db: ReturnType<typeof setup>['db'], search = '') =>
  customersQuery(db, SHOP, search)
    .all()
    .map((c) => c.name);

describe('customers repo (M5)', () => {
  it('adds a customer, queues it, and fills the next book number', () => {
    const { db, repo } = setup();
    const a = repo.addCustomer(SHOP, {
      name: ' Amit Shah ',
      phone: '9824012345',
      area: ' Navrangpura ',
    });
    const b = repo.addCustomer(SHOP, { name: 'Priya Desai', phone: '9898123456' });
    expect(a).toMatchObject({ name: 'Amit Shah', bookNo: '1', area: 'Navrangpura' });
    expect(b).toMatchObject({ bookNo: '2', area: null });
    const entry = listOutbox(db).find((e) => e.rowId === a.id);
    expect(entry?.payload).toMatchObject({ shop_id: SHOP, name: 'Amit Shah', book_no: '1' });
  });

  it('C1: validates name 2–50, phone ^[6-9]\\d{9}$, book no ≤ 12, area ≤ 100', () => {
    const { repo } = setup();
    const ok = { name: 'Amit', phone: '9824012345' };
    expect(() => repo.addCustomer(SHOP, { ...ok, name: 'A' })).toThrow(
      expect.objectContaining({ code: 'VALIDATION_FAILED' }),
    );
    expect(() => repo.addCustomer(SHOP, { ...ok, name: 'x'.repeat(51) })).toThrow();
    for (const phone of [
      '12345',
      '5824012345',
      '982401234',
      '98240123456',
      '98240 12345',
      'abcdefghij',
    ]) {
      expect(() => repo.addCustomer(SHOP, { ...ok, phone })).toThrow(
        expect.objectContaining({ code: 'VALIDATION_FAILED' }),
      );
    }
    expect(() => repo.addCustomer(SHOP, { ...ok, bookNo: '1'.repeat(13) })).toThrow();
    expect(() => repo.addCustomer(SHOP, { ...ok, area: 'x'.repeat(101) })).toThrow();
    expect(() =>
      repo.addCustomer(SHOP, { ...ok, bookNo: '1'.repeat(12), area: 'x'.repeat(100) }),
    ).not.toThrow();
  });

  it('C2: a duplicate phone is reported but saving is still allowed (families share numbers)', () => {
    const { db, repo } = setup();
    const amit = repo.addCustomer(SHOP, { name: 'Amit Shah', phone: '9824012345' });
    expect(findDuplicatePhone(db, SHOP, '9824012345')?.name).toBe('Amit Shah');
    expect(findDuplicatePhone(db, SHOP, '9824012345', amit.id)).toBeNull();
    expect(findDuplicatePhone(db, SHOP, '9898123456')).toBeNull();
    expect(() => repo.addCustomer(SHOP, { name: 'Amit Jr', phone: '9824012345' })).not.toThrow();
    // …and not for a deleted customer
    repo.deleteCustomer(amit.id);
    expect(findDuplicatePhone(db, SHOP, '9824012345')?.name).toBe('Amit Jr');
  });

  it('C4: next book number is the highest numeric + 1, ignoring gaps and non-numeric', () => {
    expect(nextBookNo([])).toBe('1');
    expect(nextBookNo(['101', '103', '7'])).toBe('104');
    expect(nextBookNo(['A-7', null, 'x1', '12'])).toBe('13');
    expect(nextBookNo(['999999999999'])).toBe('1000000000000');
    const { db, repo } = setup();
    repo.addCustomer(SHOP, { name: 'Amit', phone: '9824012345', bookNo: '101' });
    repo.addCustomer(SHOP, { name: 'Priya', phone: '9898123456', bookNo: 'A-7' });
    expect(suggestBookNo(db, SHOP)).toBe('102');
    expect(findByBookNo(db, SHOP, '101')?.name).toBe('Amit');
    expect(findByBookNo(db, SHOP, ' 101 ')?.name).toBe('Amit');
    expect(findByBookNo(db, SHOP, '555')).toBeNull();
    expect(findByBookNo(db, SHOP, '')).toBeNull();
  });

  it('C3: searches by name, phone and book number; Gujarati and Hindi text too', () => {
    const { db, repo } = setup();
    repo.addCustomer(SHOP, { name: 'Amit Shah', phone: '9824012345', bookNo: '101' });
    repo.addCustomer(SHOP, { name: 'Priya Desai', phone: '9898123456', bookNo: '102' });
    repo.addCustomer(SHOP, { name: 'કિરણ પટેલ', phone: '9727011223', bookNo: '103' });
    repo.addCustomer(SHOP, { name: 'राहुल मेहता', phone: '9427000001', bookNo: 'A-9' });
    expect(names(db)).toEqual(['Amit Shah', 'Priya Desai', 'राहुल मेहता', 'કિરણ પટેલ']); // by code point: Latin, Devanagari, Gujarati
    expect(names(db, 'ami')).toEqual(['Amit Shah']);
    expect(names(db, 'DESAI')).toEqual(['Priya Desai']);
    expect(names(db, '98240')).toEqual(['Amit Shah']);
    expect(names(db, '102')).toEqual(['Priya Desai']);
    expect(names(db, 'a-9')).toEqual(['राहुल मेहता']);
    expect(names(db, 'પટેલ')).toEqual(['કિરણ પટેલ']);
    expect(names(db, 'मेहता')).toEqual(['राहुल मेहता']);
    expect(names(db, '   ')).toHaveLength(4);
    expect(names(db, 'zzz')).toEqual([]);
  });

  it('treats % and _ in the search box as plain characters', () => {
    const { db, repo } = setup();
    repo.addCustomer(SHOP, { name: 'Amit 100%', phone: '9824012345' });
    repo.addCustomer(SHOP, { name: 'Priya Desai', phone: '9898123456' });
    expect(names(db, '%')).toEqual(['Amit 100%']);
    expect(names(db, '_')).toEqual([]);
    expect(likePattern('a_b%')).toBe('%a\\_b\\%%');
    expect(likePattern('  ')).toBeNull();
  });

  it('PLAN 4.2: searching 1,000 customers takes under 100 ms', () => {
    const { db, raw } = setup();
    const insert = raw.prepare(
      `insert into customers (id, shop_id, name, phone, book_no, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?)`,
    );
    const ts = '2026-11-02T10:00:00.000Z';
    raw.transaction(() => {
      for (let i = 0; i < 1000; i++) {
        insert.run(
          randomUUID(),
          SHOP,
          `Customer ${i} Patel`,
          `9${String(100000000 + i)}`,
          String(i + 1),
          ts,
          ts,
        );
      }
    })();
    for (const q of ['Customer 77', '9100000', '555', 'patel']) {
      const start = performance.now();
      const rows = customersQuery(db, SHOP, q).all();
      const ms = performance.now() - start;
      expect(rows.length).toBeGreaterThan(0);
      expect(ms).toBeLessThan(100);
    }
    expect(customersQuery(db, SHOP).all()).toHaveLength(1000);
  });

  it('edits a customer; unchanged fields stay; one outbox entry per row', () => {
    const { db, repo } = setup();
    const a = repo.addCustomer(SHOP, {
      name: 'Amit Shah',
      phone: '9824012345',
      area: 'Navrangpura',
    });
    const edited = repo.updateCustomer(a.id, { name: 'Amit S. Shah', area: '' });
    expect(edited).toMatchObject({
      name: 'Amit S. Shah',
      phone: '9824012345',
      area: null,
      bookNo: a.bookNo,
    });
    expect(() => repo.updateCustomer(a.id, { phone: '123' })).toThrow(
      expect.objectContaining({ code: 'VALIDATION_FAILED' }),
    );
    expect(() => repo.updateCustomer('missing', { name: 'Zed' })).toThrow(
      expect.objectContaining({ code: 'NOT_FOUND' }),
    );
    expect(listOutbox(db).filter((e) => e.rowId === a.id)).toHaveLength(1);
  });

  describe('delete (M5)', () => {
    function withOrder(status: 'received' | 'ready' | 'delivered', cancelled = false) {
      const ctx = setup();
      const c = ctx.repo.addCustomer(SHOP, { name: 'Amit Shah', phone: '9824012345' });
      const ts = '2026-11-02T10:00:00.000Z';
      ctx.raw
        .prepare(
          `insert into orders (id, shop_id, customer_id, order_no, status, order_date, due_date, delivered_on, cancelled_at, created_at, updated_at)
           values (?, ?, ?, 1001, ?, '2026-11-01', '2026-11-08', ?, ?, ?, ?)`,
        )
        .run(
          randomUUID(),
          SHOP,
          c.id,
          status,
          status === 'delivered' ? '2026-11-02' : null,
          cancelled ? ts : null,
          ts,
          ts,
        );
      return { ...ctx, c };
    }

    it('C5: soft delete hides the row (kept as a tombstone) and Undo restores it', () => {
      const { db, raw, repo } = setup();
      const c = repo.addCustomer(SHOP, { name: 'Amit Shah', phone: '9824012345' });
      repo.deleteCustomer(c.id);
      expect(names(db)).toEqual([]);
      expect(raw.prepare('select count(*) n from customers').get()).toEqual({ n: 1 });
      expect(listOutbox(db)[0]?.payload.deleted_at).toEqual(expect.any(String));
      repo.restoreCustomer(c.id);
      expect(names(db)).toEqual(['Amit Shah']);
      expect(listOutbox(db)[0]?.payload.deleted_at).toBeNull();
    });

    it.each(['received', 'ready'] as const)('is blocked while an order is %s', (status) => {
      const { repo, c, db } = withOrder(status);
      expect(() => repo.deleteCustomer(c.id)).toThrow(
        expect.objectContaining({
          code: 'BUSINESS_RULE',
          details: { reason: 'CUSTOMER_HAS_ACTIVE_ORDERS' },
        }),
      );
      expect(names(db)).toEqual(['Amit Shah']);
    });

    it('is allowed when the orders are delivered or cancelled', () => {
      const delivered = withOrder('delivered');
      expect(() => delivered.repo.deleteCustomer(delivered.c.id)).not.toThrow();
      const cancelled = withOrder('received', true);
      expect(() => cancelled.repo.deleteCustomer(cancelled.c.id)).not.toThrow();
    });
  });
});

describe('order money and customer dues (TESTING.md OR1, H1)', () => {
  it('OR1: 2×650 + 1×700 + extra 150 − 50, GST 5 % → base 2100, tax 105, total 2205', () => {
    const m = computeOrderMoney({
      discount: 50,
      gstRate: 5,
      cancelled: false,
      items: [
        { qty: 2, rate: 650 },
        { qty: 1, rate: 700 },
      ],
      extras: [{ amount: 150 }],
      payments: [{ amount: 1000 }],
    });
    expect(m).toEqual({
      subtotal: 2000,
      extras: 150,
      base: 2100,
      tax: 105,
      total: 2205,
      paid: 1000,
      balance: 1205,
    });
  });

  it('balance is 0 when cancelled, never negative, and discount cannot push base below 0', () => {
    const base = {
      discount: 0,
      gstRate: 0,
      items: [{ qty: 1, rate: 500 }],
      extras: [],
      payments: [{ amount: 800 }],
    };
    expect(computeOrderMoney({ ...base, cancelled: false }).balance).toBe(0);
    expect(computeOrderMoney({ ...base, payments: [], cancelled: true }).balance).toBe(0);
    expect(
      computeOrderMoney({ ...base, discount: 9999, payments: [], cancelled: false }).base,
    ).toBe(0);
    expect(
      computeOrderMoney({
        ...base,
        payments: [{ amount: 500 }, { amount: -100 }],
        cancelled: false,
      }).balance,
    ).toBe(100);
  });

  it('sums dues, active and total orders per customer', () => {
    const order = (
      id: string,
      customerId: string,
      status: 'received' | 'ready' | 'delivered',
      cancelledAt: string | null = null,
    ) => ({ id, customerId, discount: 0, gstRate: 0, cancelledAt, status });
    const stats = computeCustomerStats(
      [
        order('o1', 'amit', 'received'),
        order('o2', 'amit', 'delivered'),
        order('o3', 'amit', 'ready', '2026-11-01'),
        order('o4', 'priya', 'ready'),
      ],
      [
        { orderId: 'o1', qty: 2, rate: 650 },
        { orderId: 'o2', qty: 1, rate: 700 },
        { orderId: 'o3', qty: 1, rate: 900 },
        { orderId: 'o4', qty: 1, rate: 600 },
      ],
      [],
      [
        { orderId: 'o1', amount: 1000 },
        { orderId: 'o2', amount: 700 },
        { orderId: 'o4', amount: 600 },
      ],
    );
    expect(stats.get('amit')).toEqual({ orders: 3, active: 1, due: 300 });
    expect(stats.get('priya')).toEqual({ orders: 1, active: 1, due: 0 });
    expect(stats.get('nobody')).toBeUndefined();
  });
});

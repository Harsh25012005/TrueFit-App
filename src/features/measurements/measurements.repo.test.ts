import { randomUUID as mockUuid } from 'crypto';

import { createTestDb } from '@/db/testing';
import { createCustomersRepo } from '@/features/customers/customers.repo';
import { createGarmentsRepo } from '@/features/garments/garments.repo';
import { listOutbox } from '@/sync/outbox';

import {
  createMeasurementsRepo,
  customerMeasurementsQuery,
  shopValuesQuery,
  versionsQuery,
} from './measurements.repo';

jest.mock('@/db/client', () => ({ db: {} }));
jest.mock('@/lib/ids', () => ({ newId: () => mockUuid() }));

const SHOP = 'shop-1';
let clock = 0;
const now = () => new Date(Date.UTC(2026, 10, 2, 10, 0, clock++)).toISOString();

function setup() {
  const { db, raw } = createTestDb();
  const garments = createGarmentsRepo(db, now);
  const customersRepo = createCustomersRepo(db, now);
  const repo = createMeasurementsRepo(db, now);
  const shirt = garments.addGarment(SHOP, { name: 'Shirt' });
  const [length, chest, waist] = ['Length', 'Chest', 'Waist'].map((n) =>
    garments.addField(shirt.id, n),
  );
  const amit = customersRepo.addCustomer(SHOP, { name: 'Amit Shah', phone: '9824012345' });
  return { db, raw, repo, garments, shirt, length: length!, chest: chest!, waist: waist!, amit };
}

const values = (ctx: ReturnType<typeof setup>, measurementId: string) =>
  Object.fromEntries(
    shopValuesQuery(ctx.db, SHOP)
      .all()
      .filter((v) => v.measurementId === measurementId)
      .map((v) => [v.fieldId, v.valueIn]),
  );

describe('measurements repo (M6)', () => {
  it('first save stores values in inches, with no history yet; everything is queued', () => {
    const ctx = setup();
    const { measurement, versionSaved } = ctx.repo.saveMeasurement(ctx.amit.id, ctx.shirt.id, {
      values: { [ctx.length.id]: 29, [ctx.chest.id]: 40.5 },
      notes: '  Loose at chest ',
    });
    expect(versionSaved).toBe(false);
    expect(measurement).toMatchObject({
      customerId: ctx.amit.id,
      notes: 'Loose at chest',
      measuredOn: '2026-11-02',
    });
    expect(values(ctx, measurement.id)).toEqual({ [ctx.length.id]: 29, [ctx.chest.id]: 40.5 });
    expect(versionsQuery(ctx.db, measurement.id).all()).toHaveLength(0);

    const queued = listOutbox(ctx.db);
    expect(queued.filter((e) => e.tableName === 'measurements')).toHaveLength(1);
    const valueEntries = queued.filter((e) => e.tableName === 'measurement_values');
    expect(valueEntries.map((e) => e.rowId).sort()).toEqual(
      [`${measurement.id}:${ctx.length.id}`, `${measurement.id}:${ctx.chest.id}`].sort(),
    );
    expect(valueEntries[0]?.payload).toMatchObject({
      measurement_id: measurement.id,
      shop_id: SHOP,
    });
  });

  it('ME1: values outside 0.25–999.99 inches, an empty set, and long notes are rejected', () => {
    const ctx = setup();
    const save = (v: Record<string, number>, notes?: string) => () =>
      ctx.repo.saveMeasurement(ctx.amit.id, ctx.shirt.id, { values: v, notes });
    expect(save({ [ctx.chest.id]: 0 })).toThrow(
      expect.objectContaining({ code: 'VALIDATION_FAILED' }),
    );
    expect(save({ [ctx.chest.id]: 0.2 })).toThrow();
    expect(save({ [ctx.chest.id]: 1000 })).toThrow();
    expect(save({ [ctx.chest.id]: -4 })).toThrow();
    expect(save({})).toThrow(expect.objectContaining({ code: 'VALIDATION_FAILED' }));
    expect(save({ [ctx.chest.id]: 40 }, 'x'.repeat(301))).toThrow();
    expect(save({ [ctx.chest.id]: 0.25 })).not.toThrow();
  });

  it('rounds to 2 decimals and refuses fields of another cloth', () => {
    const ctx = setup();
    const pant = ctx.garments.addGarment(SHOP, { name: 'Pant' });
    const hip = ctx.garments.addField(pant.id, 'Hip');
    const { measurement } = ctx.repo.saveMeasurement(ctx.amit.id, ctx.shirt.id, {
      values: { [ctx.chest.id]: 40.456 },
    });
    expect(values(ctx, measurement.id)).toEqual({ [ctx.chest.id]: 40.46 });
    expect(() =>
      ctx.repo.saveMeasurement(ctx.amit.id, ctx.shirt.id, { values: { [hip.id]: 30 } }),
    ).toThrow(
      expect.objectContaining({ code: 'BUSINESS_RULE', details: { reason: 'FIELD_NOT_IN_CLOTH' } }),
    );
    expect(() =>
      ctx.repo.saveMeasurement('missing', ctx.shirt.id, { values: { [ctx.chest.id]: 40 } }),
    ).toThrow(expect.objectContaining({ code: 'NOT_FOUND' }));
  });

  it('ME4 / M6: one current measurement per customer per cloth — a second save updates it', () => {
    const ctx = setup();
    const first = ctx.repo.saveMeasurement(ctx.amit.id, ctx.shirt.id, {
      values: { [ctx.chest.id]: 40 },
    });
    const second = ctx.repo.saveMeasurement(ctx.amit.id, ctx.shirt.id, {
      values: { [ctx.chest.id]: 41 },
    });
    expect(second.measurement.id).toBe(first.measurement.id);
    expect(customerMeasurementsQuery(ctx.db, ctx.amit.id).all()).toHaveLength(1);
  });

  it('ME3: an edit snapshots the previous values and notes into history', () => {
    const ctx = setup();
    const first = ctx.repo.saveMeasurement(ctx.amit.id, ctx.shirt.id, {
      values: { [ctx.length.id]: 29, [ctx.chest.id]: 40 },
      notes: 'first',
    });
    const edit = ctx.repo.saveMeasurement(ctx.amit.id, ctx.shirt.id, {
      values: { [ctx.length.id]: 29, [ctx.chest.id]: 41, [ctx.waist.id]: 36 },
      notes: 'second',
    });
    expect(edit.versionSaved).toBe(true);
    const [v] = versionsQuery(ctx.db, first.measurement.id).all();
    expect(v).toMatchObject({
      notes: 'first',
      values: { [ctx.length.id]: 29, [ctx.chest.id]: 40 },
    });
    expect(values(ctx, first.measurement.id)).toEqual({
      [ctx.length.id]: 29,
      [ctx.chest.id]: 41,
      [ctx.waist.id]: 36,
    });

    // only the changed value rows are queued again (waist new, chest changed; length untouched)
    const entries = listOutbox(ctx.db).filter((e) => e.tableName === 'measurement_values');
    expect(entries.find((e) => e.rowId.endsWith(ctx.chest.id))?.payload.value_in).toBe(41);
    expect(listOutbox(ctx.db).filter((e) => e.tableName === 'measurement_versions')).toHaveLength(
      1,
    );
  });

  it('a field left out of an edit is hidden (soft-deleted), not lost', () => {
    const ctx = setup();
    const { measurement } = ctx.repo.saveMeasurement(ctx.amit.id, ctx.shirt.id, {
      values: { [ctx.length.id]: 29, [ctx.chest.id]: 40 },
    });
    ctx.repo.saveMeasurement(ctx.amit.id, ctx.shirt.id, { values: { [ctx.chest.id]: 40 } });
    expect(values(ctx, measurement.id)).toEqual({ [ctx.chest.id]: 40 });
    expect(ctx.raw.prepare('select count(*) n from measurement_values').get()).toEqual({ n: 2 });
    // putting it back restores the same row
    ctx.repo.saveMeasurement(ctx.amit.id, ctx.shirt.id, {
      values: { [ctx.length.id]: 30, [ctx.chest.id]: 40 },
    });
    expect(values(ctx, measurement.id)).toEqual({ [ctx.length.id]: 30, [ctx.chest.id]: 40 });
    expect(ctx.raw.prepare('select count(*) n from measurement_values').get()).toEqual({ n: 2 });
  });

  it('ME3: only the latest 10 versions are kept — the 11th edit drops the oldest', () => {
    const ctx = setup();
    let id = '';
    for (let chest = 30; chest <= 41; chest++) {
      id = ctx.repo.saveMeasurement(ctx.amit.id, ctx.shirt.id, {
        values: { [ctx.chest.id]: chest },
      }).measurement.id;
    }
    // 12 saves → 11 edits → 11 snapshots made, 10 kept (chest 30 = oldest, dropped)
    const kept = versionsQuery(ctx.db, id)
      .all()
      .map((v) => v.values[ctx.chest.id]);
    expect(kept).toEqual([40, 39, 38, 37, 36, 35, 34, 33, 32, 31]);
    expect(ctx.raw.prepare('select count(*) n from measurement_versions').get()).toEqual({ n: 10 });
  });

  it('"Use this version" saves the old values as a new edit and keeps history', () => {
    const ctx = setup();
    const a = ctx.repo.saveMeasurement(ctx.amit.id, ctx.shirt.id, {
      values: { [ctx.chest.id]: 38 },
      notes: 'old',
    });
    ctx.repo.saveMeasurement(ctx.amit.id, ctx.shirt.id, {
      values: { [ctx.chest.id]: 42 },
      notes: 'new',
    });
    const [old] = versionsQuery(ctx.db, a.measurement.id).all();
    const restored = ctx.repo.restoreVersion(old!.id);
    expect(restored.versionSaved).toBe(true);
    expect(values(ctx, a.measurement.id)).toEqual({ [ctx.chest.id]: 38 });
    expect(customerMeasurementsQuery(ctx.db, ctx.amit.id).all()[0]?.notes).toBe('old');
    // the value we replaced (42) is now in history
    expect(versionsQuery(ctx.db, a.measurement.id).all()[0]?.values[ctx.chest.id]).toBe(42);
    expect(() => ctx.repo.restoreVersion('missing')).toThrow(
      expect.objectContaining({ code: 'NOT_FOUND' }),
    );
  });

  it('delete hides the measurement and its values (tombstones queued); a new one can follow', () => {
    const ctx = setup();
    const { measurement } = ctx.repo.saveMeasurement(ctx.amit.id, ctx.shirt.id, {
      values: { [ctx.chest.id]: 40 },
    });
    ctx.repo.deleteMeasurement(measurement.id);
    expect(customerMeasurementsQuery(ctx.db, ctx.amit.id).all()).toHaveLength(0);
    expect(shopValuesQuery(ctx.db, SHOP).all()).toHaveLength(0);
    expect(listOutbox(ctx.db).find((e) => e.rowId === measurement.id)?.payload.deleted_at).toEqual(
      expect.any(String),
    );
    const again = ctx.repo.saveMeasurement(ctx.amit.id, ctx.shirt.id, {
      values: { [ctx.chest.id]: 41 },
    });
    expect(again.measurement.id).not.toBe(measurement.id);
    expect(again.versionSaved).toBe(false);
    expect(() => ctx.repo.deleteMeasurement(measurement.id)).toThrow(
      expect.objectContaining({ code: 'NOT_FOUND' }),
    );
  });

  it('measured_on uses the Indian date (a save at 23:30 UTC is already the next day)', () => {
    const ctx = setup();
    const late = createMeasurementsRepo(ctx.db, () => '2026-11-01T23:30:00.000Z');
    const { measurement } = late.saveMeasurement(ctx.amit.id, ctx.shirt.id, {
      values: { [ctx.chest.id]: 40 },
    });
    expect(measurement.measuredOn).toBe('2026-11-02');
  });
});

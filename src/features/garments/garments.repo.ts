import { and, asc, eq, isNull, sql } from 'drizzle-orm';

import { db as appDb } from '@/db/client';
import {
  garmentTypes,
  measurementFields,
  measurementValues,
  measurements,
  orderItems,
  orders,
} from '@/db/schema';
import type { AppDb, DbOrTx } from '@/db/types';
import { AppError, toAppError } from '@/lib/errors';
import { newId } from '@/lib/ids';
import { enqueueUpsert } from '@/sync/outbox';

import {
  fieldNameSchema,
  garmentInputSchema,
  garmentPatchSchema,
  MAX_FIELDS_PER_GARMENT,
  type GarmentInput,
  type GarmentPatch,
} from './garments.schema';

export type GarmentRow = typeof garmentTypes.$inferSelect;
export type FieldRow = typeof measurementFields.$inferSelect;

/** Domain errors carry a `reason` the screens translate (never raw text). */
const duplicate = (field: string) =>
  new AppError('CONFLICT', 'Duplicate name', { details: { reason: 'duplicate_name', field } });
const blocked = (reason: string) =>
  new AppError('BUSINESS_RULE', reason, { details: { reason }, retryable: false });

function validate<T>(parse: () => T): T {
  try {
    return parse();
  } catch (e) {
    throw toAppError(e);
  }
}

// ─── Reads (Drizzle query builders so hooks can run them as live queries) ───────────────────

export const garmentsQuery = (db: DbOrTx, shopId: string) =>
  db
    .select()
    .from(garmentTypes)
    .where(and(eq(garmentTypes.shopId, shopId), isNull(garmentTypes.deletedAt)))
    .orderBy(asc(garmentTypes.sortOrder), asc(garmentTypes.name));

export const fieldsQuery = (db: DbOrTx, shopId: string) =>
  db
    .select()
    .from(measurementFields)
    .where(and(eq(measurementFields.shopId, shopId), isNull(measurementFields.deletedAt)))
    .orderBy(asc(measurementFields.sortOrder), asc(measurementFields.name));

/** field id of every live measurement value (counted per field on the detail screen). */
export const valueFieldIdsQuery = (db: DbOrTx, shopId: string) =>
  db
    .select({ fieldId: measurementValues.fieldId })
    .from(measurementValues)
    .where(and(eq(measurementValues.shopId, shopId), isNull(measurementValues.deletedAt)));

/** (customer, cloth) of every live measurement (customers per cloth on the list screen). */
export const measuredPairsQuery = (db: DbOrTx, shopId: string) =>
  db
    .select({ customerId: measurements.customerId, garmentTypeId: measurements.garmentTypeId })
    .from(measurements)
    .where(and(eq(measurements.shopId, shopId), isNull(measurements.deletedAt)));

// ─── Writes: validate → write → enqueue, in ONE transaction ─────────────────────────────────

const lower = (s: string) => s.toLowerCase();

function liveGarments(tx: DbOrTx, shopId: string): GarmentRow[] {
  return garmentsQuery(tx, shopId).all();
}

function liveFields(tx: DbOrTx, garmentId: string): FieldRow[] {
  return tx
    .select()
    .from(measurementFields)
    .where(and(eq(measurementFields.garmentTypeId, garmentId), isNull(measurementFields.deletedAt)))
    .orderBy(asc(measurementFields.sortOrder), asc(measurementFields.name))
    .all();
}

function getGarment(tx: DbOrTx, id: string): GarmentRow {
  const row = tx.select().from(garmentTypes).where(eq(garmentTypes.id, id)).get();
  if (!row || row.deletedAt) throw new AppError('NOT_FOUND', 'Cloth type not found');
  return row;
}

function getField(tx: DbOrTx, id: string): FieldRow {
  const row = tx.select().from(measurementFields).where(eq(measurementFields.id, id)).get();
  if (!row || row.deletedAt) throw new AppError('NOT_FOUND', 'Field not found');
  return row;
}

function saveGarment(tx: DbOrTx, row: GarmentRow) {
  tx.update(garmentTypes).set(row).where(eq(garmentTypes.id, row.id)).run();
  enqueueUpsert(tx, garmentTypes, row.id, row, row.updatedAt);
}

function saveField(tx: DbOrTx, row: FieldRow) {
  tx.update(measurementFields).set(row).where(eq(measurementFields.id, row.id)).run();
  enqueueUpsert(tx, measurementFields, row.id, row, row.updatedAt);
}

export function createGarmentsRepo(db: AppDb, now: () => string = () => new Date().toISOString()) {
  return {
    /** M4: add a cloth type (name 2–30, unique per shop ignoring case). */
    addGarment(shopId: string, input: GarmentInput): GarmentRow {
      const data = validate(() => garmentInputSchema.parse(input));
      return db.transaction((tx) => {
        const existing = liveGarments(tx, shopId);
        if (existing.some((g) => lower(g.name) === lower(data.name))) throw duplicate('name');
        const stamp = now();
        const row: GarmentRow = {
          id: newId(),
          shopId,
          name: data.name,
          sortOrder: existing.length ? Math.max(...existing.map((g) => g.sortOrder)) + 1 : 0,
          styleOptions: data.styleOptions ?? {},
          fabricPerPieceM: data.fabricPerPieceM ?? 0,
          createdAt: stamp,
          updatedAt: stamp,
          deletedAt: null,
        };
        tx.insert(garmentTypes).values(row).run();
        enqueueUpsert(tx, garmentTypes, row.id, row, stamp);
        return row;
      });
    },

    /** Rename and edit styles / fabric. Renaming shows everywhere: names are read live. */
    updateGarment(id: string, patch: GarmentPatch): GarmentRow {
      const data = validate(() => garmentPatchSchema.parse(patch));
      return db.transaction((tx) => {
        const current = getGarment(tx, id);
        if (data.name !== undefined) {
          const others = liveGarments(tx, current.shopId).filter((g) => g.id !== id);
          if (others.some((g) => lower(g.name) === lower(data.name!))) throw duplicate('name');
        }
        const next: GarmentRow = {
          ...current,
          ...(data.name !== undefined && { name: data.name }),
          ...(data.fabricPerPieceM !== undefined && { fabricPerPieceM: data.fabricPerPieceM }),
          ...(data.styleOptions !== undefined && { styleOptions: data.styleOptions }),
          updatedAt: now(),
        };
        saveGarment(tx, next);
        return next;
      });
    },

    /**
     * Soft-delete a cloth and its fields. Blocked while an active order uses it
     * (received/ready, not cancelled) — FEATURES.md M4, TESTING.md G3.
     */
    deleteGarment(id: string): void {
      db.transaction((tx) => {
        const garment = getGarment(tx, id);
        const inUse = tx
          .select({ n: sql<number>`count(*)` })
          .from(orderItems)
          .innerJoin(orders, eq(orders.id, orderItems.orderId))
          .where(
            and(
              eq(orderItems.garmentTypeId, id),
              isNull(orderItems.deletedAt),
              isNull(orders.deletedAt),
              isNull(orders.cancelledAt),
              sql`${orders.status} <> 'delivered'`,
            ),
          )
          .get();
        if ((inUse?.n ?? 0) > 0) throw blocked('GARMENT_IN_USE');
        const stamp = now();
        for (const field of liveFields(tx, id)) {
          saveField(tx, { ...field, deletedAt: stamp, updatedAt: stamp });
        }
        saveGarment(tx, { ...garment, deletedAt: stamp, updatedAt: stamp });
      });
    },

    /** Add a measurement field at the end (name 1–30, unique per cloth, max 30 fields). */
    addField(garmentId: string, name: string): FieldRow {
      const clean = validate(() => fieldNameSchema.parse(name));
      return db.transaction((tx) => {
        const garment = getGarment(tx, garmentId);
        const fields = liveFields(tx, garmentId);
        if (fields.length >= MAX_FIELDS_PER_GARMENT) throw blocked('TOO_MANY_FIELDS');
        if (fields.some((f) => lower(f.name) === lower(clean))) throw duplicate('name');
        const stamp = now();
        const row: FieldRow = {
          id: newId(),
          shopId: garment.shopId,
          garmentTypeId: garmentId,
          name: clean,
          sortOrder: fields.length ? Math.max(...fields.map((f) => f.sortOrder)) + 1 : 0,
          createdAt: stamp,
          updatedAt: stamp,
          deletedAt: null,
        };
        tx.insert(measurementFields).values(row).run();
        enqueueUpsert(tx, measurementFields, row.id, row, stamp);
        return row;
      });
    },

    /** Rename a field; saved measurements follow because values point at the field id. */
    renameField(id: string, name: string): FieldRow {
      const clean = validate(() => fieldNameSchema.parse(name));
      return db.transaction((tx) => {
        const current = getField(tx, id);
        const others = liveFields(tx, current.garmentTypeId).filter((f) => f.id !== id);
        if (others.some((f) => lower(f.name) === lower(clean))) throw duplicate('name');
        const next = { ...current, name: clean, updatedAt: now() };
        saveField(tx, next);
        return next;
      });
    },

    /** ↑↓ reorder (DESIGN.md S26): swap sort positions with the neighbour. */
    moveField(id: string, direction: 'up' | 'down'): void {
      db.transaction((tx) => {
        const current = getField(tx, id);
        const fields = liveFields(tx, current.garmentTypeId);
        const index = fields.findIndex((f) => f.id === id);
        const neighbour = fields[direction === 'up' ? index - 1 : index + 1];
        if (!neighbour) return; // already first / last
        // Re-number the whole list so equal sort orders can never tie.
        const reordered = [...fields];
        reordered[index] = neighbour;
        reordered[direction === 'up' ? index - 1 : index + 1] = current;
        const stamp = now();
        reordered.forEach((f, position) => {
          if (f.sortOrder !== position)
            saveField(tx, { ...f, sortOrder: position, updatedAt: stamp });
        });
      });
    },

    /** Soft-delete a field. Saved values stay in the database but are hidden (M4 edge case). */
    deleteField(id: string): void {
      db.transaction((tx) => {
        const current = getField(tx, id);
        const stamp = now();
        saveField(tx, { ...current, deletedAt: stamp, updatedAt: stamp });
      });
    },
  };
}

/** The app's repo, bound to the on-device database. */
export const garmentsRepo = createGarmentsRepo(appDb as unknown as AppDb);

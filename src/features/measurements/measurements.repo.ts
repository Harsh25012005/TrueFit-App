import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';

import { db as appDb } from '@/db/client';
import {
  customers,
  measurementFields,
  measurementValues,
  measurementVersions,
  measurements,
} from '@/db/schema';
import type { AppDb, DbOrTx } from '@/db/types';
import { AppError, toAppError } from '@/lib/errors';
import { todayInKolkata } from '@/lib/dates';
import { newId } from '@/lib/ids';
import { enqueueUpsert } from '@/sync/outbox';

import {
  MAX_VERSIONS,
  saveMeasurementSchema,
  type SaveMeasurementInput,
} from './measurements.schema';

export type MeasurementRow = typeof measurements.$inferSelect;
export type ValueRow = typeof measurementValues.$inferSelect;
export type VersionRow = typeof measurementVersions.$inferSelect;

const rule = (reason: string) =>
  new AppError('BUSINESS_RULE', reason, { details: { reason }, retryable: false });

// ─── Reads (live-query builders) ─────────────────────────────────────────────────────────────

export const customerMeasurementsQuery = (db: DbOrTx, customerId: string) =>
  db
    .select()
    .from(measurements)
    .where(and(eq(measurements.customerId, customerId), isNull(measurements.deletedAt)))
    .orderBy(desc(measurements.measuredOn), asc(measurements.id));

/** Every live value of the shop; filtered per measurement in memory (small, and live). */
export const shopValuesQuery = (db: DbOrTx, shopId: string) =>
  db
    .select()
    .from(measurementValues)
    .where(and(eq(measurementValues.shopId, shopId), isNull(measurementValues.deletedAt)));

/** History of one measurement, newest first (max 10 are kept). */
export const versionsQuery = (db: DbOrTx, measurementId: string) =>
  db
    .select()
    .from(measurementVersions)
    .where(eq(measurementVersions.measurementId, measurementId))
    .orderBy(desc(measurementVersions.createdAt), desc(sql`rowid`))
    .limit(MAX_VERSIONS);

// ─── Writes ──────────────────────────────────────────────────────────────────────────────────

function saveValue(tx: DbOrTx, row: ValueRow) {
  tx.insert(measurementValues)
    .values(row)
    .onConflictDoUpdate({
      target: [measurementValues.measurementId, measurementValues.fieldId],
      set: row,
    })
    .run();
  enqueueUpsert(tx, measurementValues, [row.measurementId, row.fieldId], row, row.updatedAt);
}

function saveMeasurementRow(tx: DbOrTx, row: MeasurementRow) {
  tx.update(measurements).set(row).where(eq(measurements.id, row.id)).run();
  enqueueUpsert(tx, measurements, row.id, row, row.updatedAt);
}

/** Keeps only the newest MAX_VERSIONS on the phone; the server's nightly job does the same. */
function pruneVersions(tx: DbOrTx, measurementId: string) {
  const keep = versionsQuery(tx, measurementId)
    .all()
    .map((v) => v.id);
  if (keep.length < MAX_VERSIONS) return;
  tx.delete(measurementVersions)
    .where(
      and(
        eq(measurementVersions.measurementId, measurementId),
        sql`${measurementVersions.id} not in (${sql.join(
          keep.map((id) => sql`${id}`),
          sql`, `,
        )})`,
      ),
    )
    .run();
}

export function createMeasurementsRepo(
  db: AppDb,
  now: () => string = () => new Date().toISOString(),
) {
  /** The core of PRD M6 and of the server's save_measurement(): current set + history. */
  function save(
    customerId: string,
    garmentTypeId: string,
    input: SaveMeasurementInput,
  ): { measurement: MeasurementRow; versionSaved: boolean } {
    let data;
    try {
      data = saveMeasurementSchema.parse(input);
    } catch (e) {
      throw toAppError(e);
    }
    return db.transaction((tx) => {
      const garment = tx
        .select()
        .from(measurementFields)
        .where(
          and(
            eq(measurementFields.garmentTypeId, garmentTypeId),
            isNull(measurementFields.deletedAt),
          ),
        )
        .all();
      const garmentFieldIds = new Set(garment.map((f) => f.id));
      if (Object.keys(data.values).some((id) => !garmentFieldIds.has(id))) {
        throw rule('FIELD_NOT_IN_CLOTH');
      }
      const customer = tx
        .select({ shopId: customers.shopId })
        .from(customers)
        .where(and(eq(customers.id, customerId), isNull(customers.deletedAt)))
        .get();
      if (!customer) throw new AppError('NOT_FOUND', 'Customer not found');

      const stamp = now();
      const today = todayInKolkata(new Date(stamp));
      const existing = tx
        .select()
        .from(measurements)
        .where(
          and(
            eq(measurements.customerId, customerId),
            eq(measurements.garmentTypeId, garmentTypeId),
            isNull(measurements.deletedAt),
          ),
        )
        .get();

      let measurement: MeasurementRow;
      let versionSaved = false;
      if (existing) {
        const oldValues = tx
          .select()
          .from(measurementValues)
          .where(
            and(
              eq(measurementValues.measurementId, existing.id),
              isNull(measurementValues.deletedAt),
            ),
          )
          .all();
        // Snapshot the values BEFORE the change (DATABASE.md §2.9).
        const version: VersionRow = {
          id: newId(),
          shopId: existing.shopId,
          measurementId: existing.id,
          values: Object.fromEntries(oldValues.map((v) => [v.fieldId, v.valueIn])),
          notes: existing.notes,
          measuredOn: existing.measuredOn,
          createdAt: stamp,
          updatedAt: stamp,
        };
        tx.insert(measurementVersions).values(version).run();
        enqueueUpsert(tx, measurementVersions, version.id, version, stamp);
        pruneVersions(tx, existing.id);
        versionSaved = true;
        measurement = { ...existing, notes: data.notes, measuredOn: today, updatedAt: stamp };
        saveMeasurementRow(tx, measurement);
      } else {
        measurement = {
          id: newId(),
          shopId: customer.shopId,
          customerId,
          garmentTypeId,
          notes: data.notes,
          measuredOn: today,
          createdAt: stamp,
          updatedAt: stamp,
          deletedAt: null,
        };
        tx.insert(measurements).values(measurement).run();
        enqueueUpsert(tx, measurements, measurement.id, measurement, stamp);
      }

      // Values: update changed ones, restore soft-deleted ones, hide the ones left out.
      const allValues = tx
        .select()
        .from(measurementValues)
        .where(eq(measurementValues.measurementId, measurement.id))
        .all();
      const byField = new Map(allValues.map((v) => [v.fieldId, v]));
      for (const [fieldId, valueIn] of Object.entries(data.values)) {
        const current = byField.get(fieldId);
        if (current && current.deletedAt === null && current.valueIn === valueIn) continue;
        saveValue(tx, {
          measurementId: measurement.id,
          fieldId,
          shopId: measurement.shopId,
          valueIn,
          createdAt: current?.createdAt ?? stamp,
          updatedAt: stamp,
          deletedAt: null,
        });
      }
      for (const current of allValues) {
        if (current.deletedAt === null && !(current.fieldId in data.values)) {
          saveValue(tx, { ...current, deletedAt: stamp, updatedAt: stamp });
        }
      }
      return { measurement, versionSaved };
    });
  }

  return {
    saveMeasurement: save,

    /** "Use this version" (S24): saves an old version's values as a new edit (history is kept). */
    restoreVersion(versionId: string): { measurement: MeasurementRow; versionSaved: boolean } {
      const version = db
        .select()
        .from(measurementVersions)
        .where(eq(measurementVersions.id, versionId))
        .get();
      if (!version) throw new AppError('NOT_FOUND', 'Version not found');
      const m = db
        .select()
        .from(measurements)
        .where(eq(measurements.id, version.measurementId))
        .get();
      if (!m || m.deletedAt) throw new AppError('NOT_FOUND', 'Measurement not found');
      // Fields deleted since then are skipped; at least one field must remain.
      const liveFields = new Set(
        db
          .select({ id: measurementFields.id })
          .from(measurementFields)
          .where(
            and(
              inArray(measurementFields.id, Object.keys(version.values)),
              isNull(measurementFields.deletedAt),
            ),
          )
          .all()
          .map((f) => f.id),
      );
      const values = Object.fromEntries(
        Object.entries(version.values).filter(([id]) => liveFields.has(id)),
      );
      return save(m.customerId, m.garmentTypeId, { values, notes: version.notes });
    },

    /** Soft-deletes the current measurement and its values (S21 "Delete"). History stays. */
    deleteMeasurement(measurementId: string): void {
      db.transaction((tx) => {
        const m = tx.select().from(measurements).where(eq(measurements.id, measurementId)).get();
        if (!m || m.deletedAt) throw new AppError('NOT_FOUND', 'Measurement not found');
        const stamp = now();
        const values = tx
          .select()
          .from(measurementValues)
          .where(
            and(
              eq(measurementValues.measurementId, measurementId),
              isNull(measurementValues.deletedAt),
            ),
          )
          .all();
        for (const v of values) saveValue(tx, { ...v, deletedAt: stamp, updatedAt: stamp });
        saveMeasurementRow(tx, { ...m, deletedAt: stamp, updatedAt: stamp });
      });
    },
  };
}

/** The app's repo, bound to the on-device database. */
export const measurementsRepo = createMeasurementsRepo(appDb as unknown as AppDb);

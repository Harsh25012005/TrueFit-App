import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

import { db } from '@/db/client';
import type { AppDb } from '@/db/types';
import { fieldsQuery, garmentsQuery } from '@/features/garments/garments.repo';
import { toAppError } from '@/lib/errors';
import { useSessionStore } from '@/stores/session.store';

import {
  customerMeasurementsQuery,
  measurementsRepo,
  shopValuesQuery,
  versionsQuery,
  type MeasurementRow,
} from './measurements.repo';

const appDb = db as unknown as AppDb;

export interface MeasurementCardData {
  measurement: MeasurementRow;
  garmentName: string;
  /** Fields of the cloth in order, with the saved value (inches) or null if not measured. */
  rows: { fieldId: string; name: string; valueIn: number | null }[];
}

/** S21 Measurements tab: one card per cloth the customer has been measured for (live). */
export function useCustomerMeasurements(customerId: string) {
  const shopId = useSessionStore((s) => s.shopId) ?? '';
  const ms = useLiveQuery(customerMeasurementsQuery(appDb, customerId), [customerId]);
  const values = useLiveQuery(shopValuesQuery(appDb, shopId), [shopId]);
  const fields = useLiveQuery(fieldsQuery(appDb, shopId), [shopId]);
  const garments = useLiveQuery(garmentsQuery(appDb, shopId), [shopId]);

  const cards = useMemo<MeasurementCardData[]>(() => {
    const valueOf = new Map(values.data.map((v) => [`${v.measurementId}:${v.fieldId}`, v.valueIn]));
    return ms.data.map((measurement) => ({
      measurement,
      garmentName: garments.data.find((g) => g.id === measurement.garmentTypeId)?.name ?? '',
      rows: fields.data
        .filter((f) => f.garmentTypeId === measurement.garmentTypeId)
        .map((f) => ({
          fieldId: f.id,
          name: f.name,
          valueIn: valueOf.get(`${measurement.id}:${f.id}`) ?? null,
        })),
    }));
  }, [ms.data, values.data, fields.data, garments.data]);

  return {
    cards,
    garments: garments.data,
    fields: fields.data,
    loading: ms.updatedAt === undefined,
  };
}

/** S24: the saved versions of one measurement, newest first (live). */
export function useVersions(measurementId: string | null) {
  const { data } = useLiveQuery(versionsQuery(appDb, measurementId ?? ''), [measurementId]);
  return measurementId ? data : [];
}

export function measurementErrorKey(error: unknown): string {
  const err = toAppError(error);
  const reason = typeof err.details?.reason === 'string' ? err.details.reason : '';
  if (reason === 'FIELD_NOT_IN_CLOTH') return 'measurements.errors.fieldNotInCloth';
  if (err.code === 'VALIDATION_FAILED') {
    const fields = err.details?.fields as Record<string, string> | undefined;
    const first = fields ? Object.values(fields)[0] : undefined;
    if (first?.startsWith('measurements.')) return first;
  }
  return err.messageKey;
}

export const measurementActions = measurementsRepo;

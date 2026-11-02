import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

import { db } from '@/db/client';
import type { AppDb } from '@/db/types';
import { toAppError, type AppError } from '@/lib/errors';
import { useSessionStore } from '@/stores/session.store';

import {
  fieldsQuery,
  garmentsQuery,
  garmentsRepo,
  measuredPairsQuery,
  valueFieldIdsQuery,
} from './garments.repo';
import { summarizeFields, summarizeGarments } from './garments.summary';

const appDb = db as unknown as AppDb;

/** S25: cloth types with field and customer counts; re-renders on any local change. */
export function useGarmentList() {
  const shopId = useSessionStore((s) => s.shopId) ?? '';
  const garments = useLiveQuery(garmentsQuery(appDb, shopId), [shopId]);
  const fields = useLiveQuery(fieldsQuery(appDb, shopId), [shopId]);
  const pairs = useLiveQuery(measuredPairsQuery(appDb, shopId), [shopId]);
  const loaded = garments.updatedAt !== undefined && fields.updatedAt !== undefined;
  const items = useMemo(
    () => summarizeGarments(garments.data, fields.data, pairs.data),
    [garments.data, fields.data, pairs.data],
  );
  return { items, loading: !loaded };
}

/** S26: one cloth, its ordered fields, and a saved-measurement count per field. */
export function useGarmentDetail(garmentId: string) {
  const shopId = useSessionStore((s) => s.shopId) ?? '';
  const garments = useLiveQuery(garmentsQuery(appDb, shopId), [shopId]);
  const fields = useLiveQuery(fieldsQuery(appDb, shopId), [shopId]);
  const values = useLiveQuery(valueFieldIdsQuery(appDb, shopId), [shopId]);
  const pairs = useLiveQuery(measuredPairsQuery(appDb, shopId), [shopId]);

  const garment = garments.data.find((g) => g.id === garmentId) ?? null;
  const own = useMemo(
    () => fields.data.filter((f) => f.garmentTypeId === garmentId),
    [fields.data, garmentId],
  );
  const fieldItems = useMemo(() => summarizeFields(own, values.data), [own, values.data]);
  const customerCount = useMemo(
    () =>
      new Set(pairs.data.filter((p) => p.garmentTypeId === garmentId).map((p) => p.customerId))
        .size,
    [pairs.data, garmentId],
  );
  const loaded = garments.updatedAt !== undefined;
  return { garment, fields: fieldItems, customerCount, loading: !loaded };
}

/** i18n key for a repo error (never raw text). */
export function garmentErrorKey(error: unknown): string {
  const err: AppError = toAppError(error);
  const reason = typeof err.details?.reason === 'string' ? err.details.reason : '';
  if (reason === 'duplicate_name') return 'garments.errors.duplicate';
  if (reason === 'GARMENT_IN_USE') return 'garments.errors.inUse';
  if (reason === 'TOO_MANY_FIELDS') return 'garments.errors.tooManyFields';
  if (err.code === 'VALIDATION_FAILED') {
    const fields = err.details?.fields as Record<string, string> | undefined;
    const first = fields ? Object.values(fields)[0] : undefined;
    if (first && first.startsWith('garments.')) return first;
  }
  return err.messageKey;
}

/** Writes go through the repo (validate → SQLite → outbox in one transaction). */
export const garmentActions = garmentsRepo;

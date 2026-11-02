import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { db } from '@/db/client';
import { shops } from '@/db/schema';
import type { AppDb } from '@/db/types';
import type { Unit } from '@/lib/units';
import { useSessionStore } from '@/stores/session.store';

const appDb = db as unknown as AppDb;

/** The owner's shop from the phone (live). */
export function useShop() {
  const shopId = useSessionStore((s) => s.shopId) ?? '';
  const { data } = useLiveQuery(appDb.select().from(shops).where(eq(shops.id, shopId)), [shopId]);
  return data[0] ?? null;
}

/** Measurement unit chosen in Settings (S27); inches until the shop is loaded. */
export function useMeasurementUnit(): Unit {
  return useShop()?.measurementUnit ?? 'in';
}

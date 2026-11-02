import { eq, isNull, and } from 'drizzle-orm';

import { db } from '@/db/client';
import { profiles, shops, subscriptions } from '@/db/schema';
import { toAppError } from '@/lib/errors';
import { getSupabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

import type { ShopSetupInput } from './shop.schema';

type ShopRow = Database['public']['Tables']['shops']['Row'];
type SubscriptionRow = Database['public']['Tables']['subscriptions']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];

/** The owner's shop from device SQLite (works offline). */
export async function getLocalShop(ownerId: string) {
  const rows = await db
    .select()
    .from(shops)
    .where(and(eq(shops.ownerId, ownerId), isNull(shops.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
}

async function cacheShop(shop: ShopRow, sub: SubscriptionRow | null, profile: ProfileRow | null) {
  await db.transaction(async (tx) => {
    const shopValues = {
      id: shop.id,
      ownerId: shop.owner_id,
      name: shop.name,
      phone: shop.phone,
      gstin: shop.gstin,
      upiId: shop.upi_id,
      defaultGstRate: shop.default_gst_rate,
      measurementUnit: shop.measurement_unit,
      weeklyOffDay: shop.weekly_off_day,
      nextOrderNo: shop.next_order_no,
      createdAt: shop.created_at,
      updatedAt: shop.updated_at,
      deletedAt: shop.deleted_at,
    };
    await tx
      .insert(shops)
      .values(shopValues)
      .onConflictDoUpdate({ target: shops.id, set: shopValues });
    if (sub) {
      const subValues = {
        id: sub.id,
        shopId: sub.shop_id,
        plan: sub.plan,
        status: sub.status,
        trialEndsAt: sub.trial_ends_at,
        currentPeriodEnd: sub.current_period_end,
        provider: sub.provider,
        providerCustomerId: sub.provider_customer_id,
        lastEventId: sub.last_event_id,
        createdAt: sub.created_at,
        updatedAt: sub.updated_at,
      };
      await tx
        .insert(subscriptions)
        .values(subValues)
        .onConflictDoUpdate({ target: subscriptions.id, set: subValues });
    }
    if (profile) {
      const profileValues = {
        id: profile.id,
        fullName: profile.full_name,
        email: profile.email,
        phone: profile.phone,
        language: profile.language,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
      };
      await tx
        .insert(profiles)
        .values(profileValues)
        .onConflictDoUpdate({ target: profiles.id, set: profileValues });
    }
  });
}

/**
 * Downloads the owner's shop, plan and profile and caches them on the device.
 * Returns the shop id, or null if this account has no shop yet (setup not finished).
 */
export async function fetchAndCacheOwnShop(ownerId: string): Promise<string | null> {
  const supabase = getSupabase();
  const [shopRes, profileRes] = await Promise.all([
    supabase.from('shops').select('*').eq('owner_id', ownerId).is('deleted_at', null).maybeSingle(),
    supabase.from('profiles').select('*').eq('id', ownerId).maybeSingle(),
  ]);
  if (shopRes.error) throw toAppError(shopRes.error, { table: 'shops', op: 'select' });
  if (!shopRes.data) return null;
  const subRes = await supabase
    .from('subscriptions')
    .select('*')
    .eq('shop_id', shopRes.data.id)
    .maybeSingle();
  await cacheShop(shopRes.data, subRes.data ?? null, profileRes.data ?? null);
  return shopRes.data.id;
}

/**
 * API.md 2.3 — create the shop (online only; FEATURES.md M2 "offline at setup → connect").
 * Calling it twice is safe: the 409 "shop exists" is treated as success.
 */
export async function createShop(ownerId: string, input: ShopSetupInput): Promise<string> {
  const { error } = await getSupabase().rpc('create_shop', {
    p_shop_name: input.shopName,
    p_owner_name: input.ownerName,
    p_phone: input.phone || undefined,
    p_language: input.language,
    p_with_sample: input.withSample,
  });
  if (error) {
    const appError = toAppError(error, { op: 'rpc' });
    if (appError.code !== 'CONFLICT') throw appError;
  }
  const shopId = await fetchAndCacheOwnShop(ownerId);
  if (!shopId) throw toAppError(new Error('Shop not found after create_shop'));
  return shopId;
}

/** API.md 2.2 — save the chosen language on the profile (M13). Best effort when offline. */
export async function saveProfileLanguage(ownerId: string, language: 'en' | 'gu' | 'hi') {
  await db.update(profiles).set({ language }).where(eq(profiles.id, ownerId));
  const { error } = await getSupabase().from('profiles').update({ language }).eq('id', ownerId);
  if (error) throw toAppError(error, { table: 'profiles', op: 'update' });
}

/** Owner name for the lock screen greeting (device copy, works offline). */
export async function getLocalProfile(userId: string) {
  const rows = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
  return rows[0] ?? null;
}

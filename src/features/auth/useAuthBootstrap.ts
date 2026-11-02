import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { restoreLanguage } from '@/i18n';
import { logger } from '@/lib/logger';
import { fetchAndCacheOwnShop, getLocalShop } from '@/features/shop/shop.repo';
import { useSessionStore } from '@/stores/session.store';

import { startSessionSync } from './auth.service';
import { hasPin, shouldLockAfterBackground } from './pin';

/**
 * App start for auth (PLAN 2.8–2.10): restore language, follow the Supabase session, lock with
 * the PIN on a cold start and after 5 minutes in the background, and find the owner's shop.
 * Mount once in the root layout, after the device DB is migrated.
 */
export function useAuthBootstrap(enabled: boolean) {
  const userId = useSessionStore((s) => s.user?.userId ?? null);
  const shopState = useSessionStore((s) => s.shopState);
  const backgroundedAt = useRef<number | null>(null);

  // Language, session, PIN.
  useEffect(() => {
    if (!enabled) return;
    restoreLanguage().catch(() => undefined);
    const stop = startSessionSync();
    hasPin()
      .then((has) => {
        const store = useSessionStore.getState();
        store.setHasPin(has);
        if (has) store.setLocked(true); // cold start asks for the PIN (PLAN 2.10)
      })
      .catch(() => undefined);
    return stop;
  }, [enabled]);

  // Background lock (DESIGN.md §8.10: 5 minutes).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      const store = useSessionStore.getState();
      if (state === 'background') backgroundedAt.current = Date.now();
      if (state === 'active') {
        if (store.hasPin && shouldLockAfterBackground(backgroundedAt.current))
          store.setLocked(true);
        backgroundedAt.current = null;
      }
    });
    return () => sub.remove();
  }, []);

  // Find the shop: device first (offline), then the server.
  useEffect(() => {
    if (!enabled || !userId || shopState !== 'unknown') return;
    let cancelled = false;
    (async () => {
      const local = await getLocalShop(userId).catch(() => null);
      if (local) {
        if (!cancelled) useSessionStore.getState().setShop(local.id);
        fetchAndCacheOwnShop(userId).catch(() => undefined); // refresh quietly
        return;
      }
      try {
        const shopId = await fetchAndCacheOwnShop(userId);
        if (!cancelled) useSessionStore.getState().setShop(shopId);
      } catch (e) {
        logger.warn('Could not load shop', e);
        if (!cancelled) useSessionStore.getState().setShop(null); // setup screen explains offline
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, userId, shopState]);
}

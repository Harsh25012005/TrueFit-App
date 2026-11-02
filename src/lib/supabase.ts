import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { AppState } from 'react-native';

import type { Database } from '@/types/supabase';

import { AppError } from './errors';
import { newId } from './ids';
import { secureStorage } from './secureStorage';

/**
 * The one Supabase client (INTEGRATIONS.md §1). Only auth.service.ts, src/sync/* and feature
 * repos may use it — screens never do. Session lives in SecureStore and survives restarts.
 */

export type TrueFitClient = SupabaseClient<Database>;

const CLIENT_INFO = `truefit-android/${Constants.expoConfig?.version ?? '0.0.0'}`;

/** Every request carries an X-Request-Id so support can match app errors to server logs. */
const fetchWithRequestId: typeof fetch = (input, init) => {
  const headers = new Headers(init?.headers);
  if (!headers.has('X-Request-Id')) headers.set('X-Request-Id', newId());
  return fetch(input, { ...init, headers });
};

export function createSupabaseClient(url: string, publicKey: string): TrueFitClient {
  return createClient<Database>(url, publicKey, {
    auth: {
      storage: secureStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
    global: { headers: { 'X-Client-Info': CLIENT_INFO }, fetch: fetchWithRequestId },
  });
}

let client: TrueFitClient | null = null;

/** Lazily created so the app still starts (offline, tests) when .env is not filled in yet. */
export function getSupabase(): TrueFitClient {
  if (client) return client;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new AppError(
      'INTERNAL',
      'Supabase is not configured: set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env',
      {
        retryable: false,
      },
    );
  }
  client = createSupabaseClient(url, key);
  // AUTH_SECURITY.md §2: refresh tokens only while the app is in the foreground.
  AppState.addEventListener('change', (state) => {
    if (state === 'active') client?.auth.startAutoRefresh();
    else client?.auth.stopAutoRefresh();
  });
  return client;
}

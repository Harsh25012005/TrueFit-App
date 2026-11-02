import { wipeLocalData } from '@/db/client';
import { toAppError } from '@/lib/errors';
import { signOutGoogle } from '@/lib/google';
import { logger } from '@/lib/logger';
import { getSupabase } from '@/lib/supabase';
import { useSessionStore } from '@/stores/session.store';

import { signOutRemote } from './auth.service';
import { clearPin } from './pin';

/**
 * PLAN 2.11 / S29. Sign-out clears this phone: session, Google account choice, PIN and the local
 * copy of the shop data (AUTH_SECURITY.md §2). The cloud copy is untouched.
 */
export async function signOutAndWipe(): Promise<void> {
  await signOutRemote();
  await Promise.all([signOutGoogle(), clearPin()]);
  try {
    await wipeLocalData();
  } catch (e) {
    logger.error('Local data wipe failed on sign-out', e);
  }
  const store = useSessionStore.getState();
  store.setHasPin(false);
  store.setSignedOut();
}

export interface DeletionScheduled {
  status: 'scheduled';
  purge_at: string;
}

/**
 * API.md 2.6 — schedules deletion (7-day grace) via the delete-account Edge Function, then
 * signs this phone out. The typed "DELETE" is checked again on the server.
 */
export async function deleteAccount(confirm: string): Promise<DeletionScheduled> {
  const { data, error } = await getSupabase().functions.invoke<DeletionScheduled>(
    'delete-account',
    {
      body: { confirm },
    },
  );
  if (error || !data) throw toAppError(error ?? new Error('No response from delete-account'));
  await signOutAndWipe();
  return data;
}

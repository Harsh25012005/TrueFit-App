import type { Session } from '@supabase/supabase-js';

import { AppError, toAppError } from '@/lib/errors';
import { getSupabase } from '@/lib/supabase';
import { useSessionStore, type SessionUser } from '@/stores/session.store';

/**
 * Supabase Auth flows for PRD M1 (email + password, Google). The only feature file allowed to
 * import supabase-js (INTEGRATIONS.md). Every function throws AppError on failure.
 */

export type CodePurpose = 'signup' | 'recovery';

/** Runs a supabase-js call and turns `{ error }` (or a throw) into an AppError. */
async function call<R extends { data: unknown; error: unknown }>(
  fn: () => Promise<R>,
): Promise<R['data']> {
  let result: R;
  try {
    result = await fn();
  } catch (e) {
    throw toAppError(e);
  }
  if (result.error) throw toAppError(result.error);
  return result.data;
}

/** Sign up; Supabase emails a 6-digit confirmation code (AUTH_SECURITY.md §1.1). */
export async function signUpWithEmail(email: string, password: string): Promise<void> {
  const data = await call(() => getSupabase().auth.signUp({ email, password }));
  // With confirmations on, an already-registered email comes back with no identities.
  if (data.user && data.user.identities?.length === 0) {
    throw new AppError('CONFLICT', 'Email already registered', {
      details: { reason: 'user_already_exists' },
    });
  }
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  await call(() => getSupabase().auth.signInWithPassword({ email, password }));
}

/** Verifies a 6-digit email code (sign-up confirmation or password reset) and signs in. */
export async function verifyEmailCode(
  email: string,
  code: string,
  purpose: CodePurpose,
): Promise<void> {
  await call(() =>
    getSupabase().auth.verifyOtp({
      email,
      token: code,
      type: purpose === 'signup' ? 'signup' : 'recovery',
    }),
  );
}

export async function resendCode(email: string, purpose: CodePurpose): Promise<void> {
  if (purpose === 'signup') {
    await call(() => getSupabase().auth.resend({ type: 'signup', email }));
  } else {
    await requestPasswordReset(email);
  }
}

/**
 * Sends a reset code. Always "succeeds" for unknown emails (no account enumeration,
 * AUTH_SECURITY.md §1.1); only offline / rate-limit errors reach the user.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  try {
    await call(() => getSupabase().auth.resetPasswordForEmail(email));
  } catch (e) {
    const err = toAppError(e);
    if (err.code === 'NETWORK_OFFLINE' || err.code === 'RATE_LIMITED') throw err;
  }
}

/** Sets a new password for the signed-in user (after the recovery code was verified). */
export async function updatePassword(password: string): Promise<void> {
  await call(() => getSupabase().auth.updateUser({ password }));
}

/** Exchanges a Google ID token for a Supabase session (AUTH_SECURITY.md §1.4). */
export async function signInWithGoogleIdToken(idToken: string): Promise<void> {
  await call(() => getSupabase().auth.signInWithIdToken({ provider: 'google', token: idToken }));
}

/** Signs out this phone only (scope=local). Local data is wiped by the caller (2.11). */
export async function signOutRemote(): Promise<void> {
  try {
    await getSupabase().auth.signOut({ scope: 'local' });
  } catch {
    // Offline sign-out still clears the local session (supabase-js removes it from storage).
  }
}

export function toSessionUser(session: Session): SessionUser {
  const { user } = session;
  const provider = user.app_metadata?.provider === 'google' ? 'google' : 'email';
  return {
    userId: user.id,
    email: user.email ?? null,
    provider,
    emailConfirmed: Boolean(user.email_confirmed_at) || provider === 'google',
  };
}

/** Keeps session.store in step with Supabase Auth. Call once at startup. */
export function startSessionSync(): () => void {
  const store = useSessionStore.getState();
  let supabase;
  try {
    supabase = getSupabase();
  } catch {
    // Not configured (.env missing): behave as signed out so the welcome flow still shows.
    store.setSignedOut();
    return () => {};
  }
  supabase.auth.getSession().then(({ data }) => {
    if (data.session) store.setSignedIn(toSessionUser(data.session));
    else store.setSignedOut();
  });
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session) useSessionStore.getState().setSignedIn(toSessionUser(session));
    else useSessionStore.getState().setSignedOut();
  });
  return () => data.subscription.unsubscribe();
}

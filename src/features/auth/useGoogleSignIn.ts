import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { toAppError } from '@/lib/errors';
import { getGoogleIdToken, isGoogleSignInAvailable } from '@/lib/google';

import { signInWithGoogleIdToken } from './auth.service';
import { authErrorKey } from './authErrors';

/** Google sign-in for S3: availability, busy state and a translated error. */
export function useGoogleSignIn() {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const available = isGoogleSignInAvailable();

  /** Resolves true once signed in (the caller hands over to the route gate). */
  async function signIn(): Promise<boolean> {
    setError(null);
    setBusy(true);
    try {
      const idToken = await getGoogleIdToken();
      if (!idToken) return false; // cancelled: stay silent (FEATURES.md M1)
      await signInWithGoogleIdToken(idToken);
      return true;
    } catch (e) {
      const err = toAppError(e);
      setError(
        t(
          err.details?.reason === 'google_unavailable'
            ? 'auth.errors.googleUnavailable'
            : authErrorKey(err),
        ),
      );
      return false;
    } finally {
      setBusy(false);
    }
  }

  return { available, busy, error, signIn };
}

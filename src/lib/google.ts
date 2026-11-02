import Constants, { ExecutionEnvironment } from 'expo-constants';

import { AppError } from './errors';

/**
 * Native Google Sign-In wrapper (INTEGRATIONS.md §3) — the only file that touches
 * @react-native-google-signin/google-signin. The native module does not exist in Expo Go, so
 * it is loaded lazily and `isGoogleSignInAvailable()` lets the UI hide/disable the button.
 *
 * Nonce: the open-source package's sign-in has no nonce parameter (only the paid "Universal"
 * add-on does). Supabase accepts Google ID tokens without one. See AUTH_SECURITY.md §1.4.
 */

type GoogleModule = typeof import('@react-native-google-signin/google-signin');

let googleModule: GoogleModule | null = null;
let configured = false;

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

function load(): GoogleModule | null {
  if (googleModule) return googleModule;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null; // Expo Go
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    googleModule = require('@react-native-google-signin/google-signin') as GoogleModule;
  } catch {
    googleModule = null;
  }
  return googleModule;
}

export function isGoogleSignInAvailable(): boolean {
  return Boolean(WEB_CLIENT_ID) && load() !== null;
}

/**
 * Opens the native Google account picker and returns an ID token, or null if the owner
 * cancelled (FEATURES.md M1: "Google cancelled → stay silent").
 */
export async function getGoogleIdToken(): Promise<string | null> {
  const mod = load();
  if (!mod || !WEB_CLIENT_ID) {
    throw new AppError('UPSTREAM_UNAVAILABLE', 'Google Sign-In not available', {
      details: { reason: 'google_unavailable' },
      retryable: false,
    });
  }
  const { GoogleSignin, isErrorWithCode, statusCodes } = mod;
  if (!configured) {
    GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
    configured = true;
  }
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (response.type === 'cancelled') return null;
    const token = response.data.idToken;
    if (!token) throw new AppError('UNAUTHENTICATED', 'Google returned no ID token');
    return token;
  } catch (e) {
    if (e instanceof AppError) throw e;
    if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) return null;
    // DEVELOPER_ERROR (SHA-1 / client ID) or Play Services missing (INTEGRATIONS.md §3 fallback).
    throw new AppError('UPSTREAM_UNAVAILABLE', 'Google Sign-In failed', {
      details: { reason: 'google_unavailable' },
      retryable: false,
      cause: e,
    });
  }
}

/** Clears the Google account choice so the picker shows next time (on sign-out). */
export async function signOutGoogle(): Promise<void> {
  const mod = load();
  if (!mod) return;
  try {
    await mod.GoogleSignin.signOut();
  } catch {
    // nothing to sign out of
  }
}

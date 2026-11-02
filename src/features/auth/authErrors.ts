import type { AppError } from '@/lib/errors';

/**
 * i18n key for an auth error. Supabase Auth reasons get specific wording; anything else falls
 * back to the generic API.md code message. Never shows raw server text (ARCHITECTURE.md §5).
 */
export function authErrorKey(error: AppError): string {
  const reason = typeof error.details?.reason === 'string' ? error.details.reason : undefined;
  switch (reason) {
    case 'invalid_credentials':
      return 'auth.errors.wrongPassword';
    case 'email_not_confirmed':
      return 'auth.errors.notConfirmed';
    case 'user_already_exists':
    case 'email_exists':
      return 'auth.errors.emailExists';
    case 'weak_password':
      return 'auth.errors.weakPassword';
    case 'otp_expired':
      return 'auth.errors.codeExpired';
  }
  if (error.code === 'NETWORK_OFFLINE') return 'auth.offline';
  return error.messageKey;
}

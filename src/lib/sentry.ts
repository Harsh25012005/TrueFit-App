import * as Sentry from '@sentry/react-native';
import type { ComponentType } from 'react';

import { toAppError, type AppError } from './errors';
import { scrub, scrubString, setErrorSink } from './logger';

/**
 * The only file that imports @sentry/react-native (INTEGRATIONS.md §7).
 * Empty EXPO_PUBLIC_SENTRY_DSN → every function here is a no-op.
 */

let enabled = false;

const SECRET_HEADERS = /^(authorization|apikey|cookie|x-client-info)$/i;

/** Removes tokens, phones and emails before an event leaves the phone (AUTH_SECURITY.md §4). */
export function beforeSend<T extends Sentry.ErrorEvent>(event: T): T {
  if (event.user) event.user = event.user.id ? { id: event.user.id } : undefined;
  if (event.request?.headers) {
    event.request.headers = Object.fromEntries(
      Object.entries(event.request.headers).map(([k, v]) => [
        k,
        SECRET_HEADERS.test(k) ? '[redacted]' : scrubString(String(v)),
      ]),
    );
  }
  if (event.request?.url) event.request.url = scrubString(event.request.url);
  if (event.request?.data) event.request.data = scrub(event.request.data);
  if (event.message) event.message = scrubString(event.message);
  for (const ex of event.exception?.values ?? []) {
    if (ex.value) ex.value = scrubString(ex.value);
  }
  if (event.extra) event.extra = scrub(event.extra) as Record<string, unknown>;
  if (event.contexts) event.contexts = scrub(event.contexts) as typeof event.contexts;
  for (const crumb of event.breadcrumbs ?? []) {
    if (crumb.message) crumb.message = scrubString(crumb.message);
    if (crumb.data) crumb.data = scrub(crumb.data) as Record<string, unknown>;
  }
  return event;
}

export function initSentry(dsn = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '') {
  if (!dsn) return false;
  Sentry.init({
    dsn,
    environment: process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
    sendDefaultPii: false,
    beforeSend: (event) => beforeSend(event),
    beforeBreadcrumb: (crumb) =>
      crumb.message ? { ...crumb, message: scrubString(crumb.message) } : crumb,
  });
  enabled = true;
  setErrorSink((error, context) => captureError(toAppError(error), context));
  return true;
}

/** Report an AppError with its code (and request id for support). */
export function captureError(error: AppError, context?: Record<string, unknown>) {
  if (!enabled) return;
  Sentry.captureException(error, {
    tags: { code: error.code },
    extra: scrub({ ...context, details: error.details, requestId: error.requestId }) as Record<
      string,
      unknown
    >,
  });
}

/** Signed-in user id only — never email or phone. */
export function setSentryUser(userId: string | null) {
  if (enabled) Sentry.setUser(userId ? { id: userId } : null);
}

/** Wraps the root component so render crashes are reported. */
export function wrapRoot(Root: ComponentType): ComponentType {
  return enabled ? Sentry.wrap(Root) : Root;
}

/** Dev-only "Send test error" (INTEGRATIONS.md §7). */
export function sendTestError() {
  if (!enabled) return false;
  Sentry.captureException(new Error('TrueFit Sentry test error'));
  return true;
}

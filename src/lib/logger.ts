/**
 * App logger. AUTH_SECURITY.md §4: never log tokens, OTPs, passwords, phone numbers, emails
 * or measurements — everything passed in is scrubbed first. In release builds only
 * warnings and errors are written; errors are also reported to Sentry (via `setErrorSink`).
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const REDACTED = '[redacted]';

/** Keys whose values are always removed, whatever they contain. */
const SECRET_KEYS =
  /^(authorization|apikey|api_key|access_token|refresh_token|id_token|token|password|otp|pin|nonce|phone|email|values|value_in)$/i;

const PATTERNS: [RegExp, string][] = [
  [/Bearer\s+[\w-]+\.[\w-]+\.[\w-]+/gi, `Bearer ${REDACTED}`],
  [/\beyJ[\w-]+\.[\w-]+\.[\w-]+/g, REDACTED], // JWT
  [/[\w.+-]+@[\w-]+\.[\w.-]+/g, REDACTED], // email
  [/(\+?91[\s-]?)?\b[6-9]\d{4}[\s-]?\d{5}\b/g, REDACTED], // Indian mobile
];

export function scrubString(text: string): string {
  return PATTERNS.reduce((acc, [re, replacement]) => acc.replace(re, replacement), text);
}

/** Deep copy with secrets removed. Handles Errors, arrays and cycles. */
export function scrub(value: unknown, seen = new WeakSet<object>()): unknown {
  if (typeof value === 'string') return scrubString(value);
  if (typeof value !== 'object' || value === null) return value;
  if (seen.has(value)) return '[circular]';
  seen.add(value);
  if (value instanceof Error) {
    return { name: value.name, message: scrubString(value.message) };
  }
  if (Array.isArray(value)) return value.map((v) => scrub(v, seen));
  return Object.fromEntries(
    Object.entries(value).map(([k, v]) => [k, SECRET_KEYS.test(k) ? REDACTED : scrub(v, seen)]),
  );
}

type ErrorSink = (error: unknown, context?: Record<string, unknown>) => void;
let errorSink: ErrorSink | null = null;

/** Wired by `initSentry()`; kept as a hook so the logger never imports an SDK. */
export function setErrorSink(sink: ErrorSink | null) {
  errorSink = sink;
}

const ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const minLevel = (): LogLevel => (__DEV__ ? 'debug' : 'warn');

function write(level: LogLevel, message: string, data?: unknown) {
  if (ORDER[level] < ORDER[minLevel()]) return;
  const line = `[${level}] ${scrubString(message)}`;
  const args = data === undefined ? [line] : [line, scrub(data)];
  (level === 'debug' ? console.log : console[level])(...args);
}

export const logger = {
  debug: (message: string, data?: unknown) => write('debug', message, data),
  info: (message: string, data?: unknown) => write('info', message, data),
  warn: (message: string, data?: unknown) => write('warn', message, data),
  error: (message: string, error?: unknown, context?: Record<string, unknown>) => {
    write('error', message, error);
    errorSink?.(error ?? new Error(message), { message, ...context });
  },
};

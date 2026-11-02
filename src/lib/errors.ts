/**
 * One error type for the whole app (ARCHITECTURE.md §5). `toAppError()` turns zod, SQLite,
 * PostgREST, Supabase Auth, Edge Function and network errors into an AppError whose `code`
 * follows API.md §2. Screens never show `message`; they show `t(\`errors.${code}\`)`.
 */

export const ERROR_CODES = [
  'VALIDATION_FAILED',
  'UNAUTHENTICATED',
  'PLAN_REQUIRED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'BUSINESS_RULE',
  'RATE_LIMITED',
  'INTERNAL',
  'UPSTREAM_UNAVAILABLE',
  'NETWORK_OFFLINE',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/** HTTP status per code (API.md §2). NETWORK_OFFLINE has none: there was no response. */
export const STATUS_BY_CODE: Record<ErrorCode, number | undefined> = {
  VALIDATION_FAILED: 400,
  UNAUTHENTICATED: 401,
  PLAN_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  BUSINESS_RULE: 422,
  RATE_LIMITED: 429,
  INTERNAL: 500,
  UPSTREAM_UNAVAILABLE: 503,
  NETWORK_OFFLINE: undefined,
};

/** Worth retrying later (sync backoff). RLS/validation errors are not (ARCHITECTURE.md §5). */
const RETRYABLE: ReadonlySet<ErrorCode> = new Set([
  'UNAUTHENTICATED', // after a token refresh
  'RATE_LIMITED',
  'INTERNAL',
  'UPSTREAM_UNAVAILABLE',
  'NETWORK_OFFLINE',
]);

export type ErrorDetails = Record<string, unknown>;

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly details?: ErrorDetails;
  readonly status?: number;
  readonly retryable: boolean;
  readonly requestId?: string;

  constructor(
    code: ErrorCode,
    message: string,
    options: {
      details?: ErrorDetails;
      status?: number;
      requestId?: string;
      retryable?: boolean;
      cause?: unknown;
    } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = 'AppError';
    this.code = code;
    this.details = options.details;
    this.status = options.status ?? STATUS_BY_CODE[code];
    this.retryable = options.retryable ?? RETRYABLE.has(code);
    this.requestId = options.requestId;
  }

  /** i18n key for the user-facing message. */
  get messageKey(): `errors.${ErrorCode}` {
    return `errors.${this.code}`;
  }
}

/** What the failing call was doing; needed to tell PLAN_REQUIRED from FORBIDDEN. */
export interface ErrorContext {
  table?: string;
  op?: 'select' | 'insert' | 'update' | 'upsert' | 'rpc';
}

/** customers/orders inserts are blocked by `shop_can_write()` when the plan expired. */
const PLAN_GATED_TABLES = new Set(['customers', 'orders']);

const POSTGRES_CODES: Record<string, ErrorCode> = {
  '23514': 'VALIDATION_FAILED', // check violation
  '22P02': 'VALIDATION_FAILED', // invalid text representation
  '23502': 'VALIDATION_FAILED', // not null violation
  '22001': 'VALIDATION_FAILED', // value too long
  PGRST102: 'VALIDATION_FAILED',
  PGRST301: 'UNAUTHENTICATED',
  PGRST303: 'UNAUTHENTICATED',
  PGRST116: 'NOT_FOUND',
  PGRST202: 'NOT_FOUND', // unknown RPC
  '23505': 'CONFLICT', // unique
  '23503': 'CONFLICT', // foreign key
  P0001: 'BUSINESS_RULE', // raised by RPCs
  P0002: 'NOT_FOUND', // RPC: customer / cloth / order not found
  PT402: 'PLAN_REQUIRED', // RPC: plan expired (PostgREST returns HTTP 402)
  '28000': 'UNAUTHENTICATED', // RPC called without a session
  '57014': 'INTERNAL', // statement timeout
};

const AUTH_CODES: Record<string, ErrorCode> = {
  validation_failed: 'VALIDATION_FAILED',
  weak_password: 'VALIDATION_FAILED',
  email_address_invalid: 'VALIDATION_FAILED',
  email_not_confirmed: 'VALIDATION_FAILED',
  invalid_credentials: 'UNAUTHENTICATED',
  otp_expired: 'UNAUTHENTICATED',
  bad_jwt: 'UNAUTHENTICATED',
  session_not_found: 'UNAUTHENTICATED',
  session_expired: 'UNAUTHENTICATED',
  refresh_token_not_found: 'UNAUTHENTICATED',
  refresh_token_already_used: 'UNAUTHENTICATED',
  user_already_exists: 'CONFLICT',
  email_exists: 'CONFLICT',
  phone_exists: 'CONFLICT',
  identity_already_exists: 'CONFLICT',
  over_request_rate_limit: 'RATE_LIMITED',
  over_sms_send_rate_limit: 'RATE_LIMITED',
  over_email_send_rate_limit: 'RATE_LIMITED',
  sms_send_failed: 'UPSTREAM_UNAVAILABLE',
};

function codeFromStatus(status: number | undefined): ErrorCode {
  switch (status) {
    case 400:
    case 422:
      return 'VALIDATION_FAILED';
    case 401:
      return 'UNAUTHENTICATED';
    case 402:
      return 'PLAN_REQUIRED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 429:
      return 'RATE_LIMITED';
    case 502:
    case 503:
    case 504:
      return 'UPSTREAM_UNAVAILABLE';
    default:
      return 'INTERNAL';
  }
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null;
const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);
const num = (v: unknown): number | undefined => (typeof v === 'number' ? v : undefined);
const isErrorCode = (v: unknown): v is ErrorCode =>
  typeof v === 'string' && (ERROR_CODES as readonly string[]).includes(v);

/** zod 4 error: `{ name: 'ZodError', issues: [{ path, code, message }] }`. */
function fromZod(err: Obj): AppError | null {
  if (err.name !== 'ZodError' || !Array.isArray(err.issues)) return null;
  const fields: Record<string, string> = {};
  for (const issue of err.issues as Obj[]) {
    const path = Array.isArray(issue.path) ? issue.path.join('.') : '';
    if (!(path in fields)) fields[path] = str(issue.message) ?? 'invalid';
  }
  const first = Object.keys(fields)[0];
  return new AppError('VALIDATION_FAILED', 'Validation failed', {
    details: { field: first, fields },
    cause: err,
  });
}

/** Edge Functions return `{ error: { code, message, details, request_id } }` (API.md §0). */
function fromEdgeFunctionBody(err: Obj): AppError | null {
  const body = isObj(err.error) ? err.error : null;
  if (!body || !isErrorCode(body.code)) return null;
  return new AppError(body.code, str(body.message) ?? body.code, {
    details: isObj(body.details) ? body.details : undefined,
    requestId: str(body.request_id),
    cause: err,
  });
}

/** Supabase Auth: AuthApiError / AuthRetryableFetchError with `code` and `status`. */
function fromAuth(err: Obj): AppError | null {
  const name = str(err.name) ?? '';
  if (!name.startsWith('Auth') && !name.includes('AuthApiError')) return null;
  const status = num(err.status);
  const authCode = str(err.code);
  if (name === 'AuthRetryableFetchError' && (status === undefined || status === 0)) {
    return new AppError('NETWORK_OFFLINE', 'Network request failed', { cause: err });
  }
  const code = (authCode ? AUTH_CODES[authCode] : undefined) ?? codeFromStatus(status);
  return new AppError(code, str(err.message) ?? code, {
    details: authCode ? { reason: authCode } : undefined,
    status,
    cause: err,
  });
}

/** PostgREST / Postgres: `{ code, message, details, hint }` (+ optional HTTP status). */
function fromPostgrest(err: Obj, ctx: ErrorContext): AppError | null {
  const pgCode = str(err.code);
  if (!pgCode || !/^(PGRST\d+|[0-9A-Z]{5})$/.test(pgCode)) return null;
  const message = str(err.message) ?? pgCode;
  let code: ErrorCode | undefined = POSTGRES_CODES[pgCode];
  if (pgCode === '42501') {
    const creating = ctx.op === 'insert' || ctx.op === 'upsert';
    code = creating && PLAN_GATED_TABLES.has(ctx.table ?? '') ? 'PLAN_REQUIRED' : 'FORBIDDEN';
  }
  const details: ErrorDetails = { pgCode };
  if (pgCode === 'P0001') details.reason = message; // e.g. MEASUREMENT_MISSING
  if (str(err.details)) details.info = err.details;
  return new AppError(code ?? codeFromStatus(num(err.status)), message, {
    details,
    cause: err,
  });
}

/** expo-sqlite throws Errors whose message carries the SQLite result code. */
function fromSqlite(err: Error): AppError | null {
  const m = err.message;
  if (/UNIQUE constraint failed|SQLITE_CONSTRAINT_(UNIQUE|PRIMARYKEY|FOREIGNKEY)/i.test(m)) {
    return new AppError('CONFLICT', m, { retryable: false, cause: err });
  }
  if (/CHECK constraint failed|NOT NULL constraint failed|SQLITE_CONSTRAINT/i.test(m)) {
    return new AppError('VALIDATION_FAILED', m, { retryable: false, cause: err });
  }
  return null;
}

function isNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return (
    /Network request failed|Failed to fetch|fetch failed|NetworkError|ECONNREFUSED|ETIMEDOUT|ENOTFOUND/i.test(
      err.message,
    ) || err.name === 'AbortError'
  );
}

/** Convert anything thrown into an AppError (never throws). */
export function toAppError(err: unknown, ctx: ErrorContext = {}): AppError {
  if (err instanceof AppError) return err;
  if (isNetworkError(err)) {
    return new AppError('NETWORK_OFFLINE', 'Network request failed', { cause: err });
  }
  if (isObj(err)) {
    const mapped =
      fromZod(err) ?? fromEdgeFunctionBody(err) ?? fromAuth(err) ?? fromPostgrest(err, ctx);
    if (mapped) return mapped;
    if (err instanceof Error) {
      const sqlite = fromSqlite(err);
      if (sqlite) return sqlite;
    }
    const status = num(err.status);
    if (status !== undefined) {
      return new AppError(codeFromStatus(status), str(err.message) ?? `HTTP ${status}`, {
        status,
        cause: err,
      });
    }
  }
  const message = err instanceof Error ? err.message : String(err);
  return new AppError('INTERNAL', message, { cause: err });
}

// Standard error JSON for every Edge Function (API.md §0): { error: { code, message, details, request_id } }.
import { corsHeaders } from './cors.ts';

export type ErrorCode =
  | 'VALIDATION_FAILED'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'INTERNAL';

const STATUS: Record<ErrorCode, number> = {
  VALIDATION_FAILED: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

export function errorResponse(
  req: Request,
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>,
): Response {
  const requestId = req.headers.get('X-Request-Id') ?? crypto.randomUUID();
  return new Response(JSON.stringify({ error: { code, message, details, request_id: requestId } }), {
    status: STATUS[code],
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });
}

export function jsonResponse(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });
}

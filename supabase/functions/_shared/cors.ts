// AUTH_SECURITY.md §4: CORS only for the future web app; the Android app is not a browser.
const ALLOWED_ORIGINS = new Set(['https://truefit.app']);

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin');
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

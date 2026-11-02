// API.md 2.6 — POST /functions/v1/delete-account { "confirm": "DELETE" } → 202 { status, purge_at }
// Marks the owner's shop deleted (it disappears from the app at once: current_shop_id() ignores
// deleted shops), signs out every session, and leaves the hard delete to the purge job after
// 7 days (AUTH_SECURITY.md §4). The purge job itself is not part of this function.
import { getCaller } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { errorResponse, jsonResponse } from '../_shared/errors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

const GRACE_DAYS = 7;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(req) });
  if (req.method !== 'POST') return errorResponse(req, 'NOT_FOUND', 'Use POST');

  const caller = await getCaller(req);
  if (!caller) return errorResponse(req, 'UNAUTHENTICATED', 'Sign in again');

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(req, 'VALIDATION_FAILED', 'Body must be JSON');
  }
  const keys = body && typeof body === 'object' ? Object.keys(body) : [];
  if (
    keys.length !== 1 ||
    (body as { confirm?: unknown }).confirm !== 'DELETE'
  ) {
    return errorResponse(req, 'VALIDATION_FAILED', 'Type DELETE to confirm', { field: 'confirm' });
  }

  const now = new Date();
  const purgeAt = new Date(now.getTime() + GRACE_DAYS * 24 * 60 * 60 * 1000);

  const { error: shopError } = await supabaseAdmin
    .from('shops')
    .update({ deleted_at: now.toISOString() })
    .eq('owner_id', caller.userId)
    .is('deleted_at', null);
  if (shopError) return errorResponse(req, 'INTERNAL', 'Could not schedule deletion');

  // Sign out every device (AUTH_SECURITY.md §2 scope=global).
  await supabaseAdmin.auth.admin.signOut(caller.jwt, 'global');

  return jsonResponse(req, { status: 'scheduled', purge_at: purgeAt.toISOString() }, 202);
});

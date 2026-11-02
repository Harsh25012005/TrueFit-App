// Service-role client — Edge Functions only, never the app (AUTH_SECURITY.md §6).
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

export const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

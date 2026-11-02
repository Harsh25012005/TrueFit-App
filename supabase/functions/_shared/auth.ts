// Resolves the signed-in owner from the request's Bearer JWT (verified by Supabase Auth).
import { supabaseAdmin } from './supabaseAdmin.ts';

export interface Caller {
  userId: string;
  jwt: string;
}

export async function getCaller(req: Request): Promise<Caller | null> {
  const header = req.headers.get('Authorization') ?? '';
  const jwt = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
  if (!jwt) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(jwt);
  if (error || !data.user) return null;
  return { userId: data.user.id, jwt };
}

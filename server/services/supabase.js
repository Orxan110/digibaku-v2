import { createClient } from '@supabase/supabase-js';
import { HttpError } from '../http.js';

/*
 * Supabase YALNIZ iki iş görür: (1) Auth — istifadəçini token-dən yoxlamaq,
 * (2) Storage — məhsul şəkilləri. Verilənlər Neon-dadır.
 * Service-role açarı yalnız serverdə istifadə olunur.
 */
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let admin = null;

function client() {
  if (!url || !serviceKey) throw new HttpError(500, 'supabase_not_configured');
  admin ??= createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}

export async function getUserFromToken(token) {
  if (!token) return null;
  const { data, error } = await client().auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

export async function uploadPublic(bucket, path, body, contentType) {
  const { error } = await client().storage.from(bucket).upload(path, body, { contentType, upsert: false });
  if (error) throw new HttpError(400, error.message);
  return client().storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/** Brauzerə verilən YALNIZ ictimai açar (anon). Service-role heç vaxt göndərilmir. */
export const authConfig = () => ({
  supabaseUrl: url || null,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || null,
});

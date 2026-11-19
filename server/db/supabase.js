import { createClient } from '@supabase/supabase-js';
import { HttpError } from '../http.js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  throw new Error('SUPABASE_URL və SUPABASE_SERVICE_ROLE_KEY təyin edilməlidir.');
}

/*
 * TƏK VERİLƏNLƏR QATI. Supabase ilə yeganə əlaqə nöqtəsi budur.
 * Başqa bazaya keçmək üçün yalnız bu faylı eyni metodlarla yenidən yazmaq kifayətdir.
 * Service-role açarı YALNIZ serverdə istifadə olunur.
 */
const client = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function applyEq(query, eq = {}) {
  let q = query;
  for (const [col, val] of Object.entries(eq)) {
    if (val !== undefined && val !== null && val !== '') q = q.eq(col, val);
  }
  return q;
}

function check(error) {
  if (!error) return;
  const map = { '23505': 409, '23503': 400, '23514': 400, '22P02': 400 };
  throw new HttpError(map[error.code] || 500, error.message);
}

export const db = {
  client,

  async list(table, { select = '*', eq, order, ascending = true, limit } = {}) {
    let q = applyEq(client.from(table).select(select), eq);
    if (order) q = q.order(order, { ascending });
    if (limit) q = q.limit(limit);
    const { data, error } = await q;
    check(error);
    return data ?? [];
  },

  async one(table, eq) {
    const rows = await db.list(table, { eq, limit: 1 });
    return rows[0] ?? null;
  },

  async insert(table, row) {
    const { data, error } = await client.from(table).insert(row).select().single();
    check(error);
    return data;
  },

  async upsert(table, row, onConflict) {
    const { data, error } = await client
      .from(table)
      .upsert(row, { onConflict })
      .select()
      .single();
    check(error);
    return data;
  },

  /** Hər zaman massiv qaytarır */
  async update(table, eq, values) {
    const { data, error } = await applyEq(client.from(table).update(values), eq).select();
    check(error);
    return data ?? [];
  },

  async remove(table, eq) {
    const { error } = await applyEq(client.from(table).delete(), eq);
    check(error);
  },

  /** Bearer token-i Supabase Auth ilə serverdə yoxlayır */
  async getUser(token) {
    if (!token) return null;
    const { data, error } = await client.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user;
  },

  async uploadPublic(bucket, path, body, contentType) {
    const { error } = await client.storage
      .from(bucket)
      .upload(path, body, { contentType, upsert: false });
    if (error) throw new HttpError(400, error.message);
    return client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  },
};

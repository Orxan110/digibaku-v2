import pg from 'pg';
import { HttpError } from '../http.js';

/*
 * ===================== NEON / POSTGRESQL QATI =====================
 * Bütün verilənlər bazası əməliyyatı bu faylda toplanır.
 * Başqa PostgreSQL-ə (Neon, Supabase DB, öz serveriniz) keçmək üçün
 * yalnız DATABASE_URL dəyişir. Kod eyni qalır.
 * ================================================================
 */
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL təyin edilməlidir (Neon connection string).');

// Serverless mühitdə hovuzu isti instansiyalarda təkrar istifadə edirik
const pool = globalThis.__digibakuPool ?? new pg.Pool({
  connectionString: url,
  max: 5,
  ssl: { rejectUnauthorized: true },
});
globalThis.__digibakuPool = pool;

// SQL identifikatorları yalnız bu nümunəyə uyğun ola bilər (SQL injection-a qarşı)
const IDENT = /^[a-z_][a-z0-9_]*$/;
const ident = (name) => {
  if (!IDENT.test(name)) throw new Error(`Yanlış identifikator: ${name}`);
  return `"${name}"`;
};
const columns = (select) =>
  !select || select === '*' ? '*' : select.split(',').map((c) => ident(c.trim())).join(', ');

// Obyekt və massivlər JSON kimi yazılır (jsonb sütunları üçün)
const norm = (v) => (v !== null && typeof v === 'object' && !(v instanceof Date) ? JSON.stringify(v) : v);

const PG_STATUS = { '23505': 409, '23503': 400, '23514': 400, '22P02': 400, '22007': 400, '22001': 400 };

async function run(text, params = []) {
  try {
    return await pool.query(text, params);
  } catch (error) {
    if (error.code) throw new HttpError(PG_STATUS[error.code] || 500, error.message);
    throw error;
  }
}

function where(eq = {}, offset = 0) {
  const parts = [];
  const params = [];
  for (const [col, val] of Object.entries(eq)) {
    if (val === undefined || val === null || val === '') continue;
    params.push(norm(val));
    parts.push(`${ident(col)} = $${offset + params.length}`);
  }
  return { sql: parts.length ? ` where ${parts.join(' and ')}` : '', params };
}

export const db = {
  pool,
  query: run,

  async list(table, { select = '*', eq, order, ascending = true, limit } = {}) {
    const w = where(eq);
    let sql = `select ${columns(select)} from ${ident(table)}${w.sql}`;
    if (order) sql += ` order by ${ident(order)} ${ascending ? 'asc' : 'desc'}`;
    if (limit) sql += ` limit ${Math.max(1, Math.floor(Number(limit)))}`;
    const { rows } = await run(sql, w.params);
    return rows;
  },

  async one(table, eq) {
    const rows = await db.list(table, { eq, limit: 1 });
    return rows[0] ?? null;
  },

  async insert(table, row) {
    const keys = Object.keys(row).filter((k) => row[k] !== undefined);
    const sql = `insert into ${ident(table)} (${keys.map(ident).join(', ')}) ` +
      `values (${keys.map((_, i) => `$${i + 1}`).join(', ')}) returning *`;
    const { rows } = await run(sql, keys.map((k) => norm(row[k])));
    return rows[0];
  },

  async upsert(table, row, onConflict) {
    const conflict = onConflict.split(',').map((c) => c.trim());
    const keys = Object.keys(row).filter((k) => row[k] !== undefined);
    const updates = keys.filter((k) => !conflict.includes(k)).map((k) => `${ident(k)} = excluded.${ident(k)}`);
    const action = updates.length ? `do update set ${updates.join(', ')}` : 'do nothing';
    const sql = `insert into ${ident(table)} (${keys.map(ident).join(', ')}) ` +
      `values (${keys.map((_, i) => `$${i + 1}`).join(', ')}) ` +
      `on conflict (${conflict.map(ident).join(', ')}) ${action} returning *`;
    const { rows } = await run(sql, keys.map((k) => norm(row[k])));
    if (rows[0]) return rows[0];
    return db.one(table, Object.fromEntries(conflict.map((c) => [c, row[c]])));
  },

  async update(table, eq, values) {
    const keys = Object.keys(values).filter((k) => values[k] !== undefined);
    if (!keys.length) throw new HttpError(400, 'nothing_to_update');
    const w = where(eq, keys.length);
    if (!w.sql) throw new Error('update: where şərti boşdur (təhlükəsizlik)');
    const set = keys.map((k, i) => `${ident(k)} = $${i + 1}`).join(', ');
    const { rows } = await run(
      `update ${ident(table)} set ${set}${w.sql} returning *`,
      [...keys.map((k) => norm(values[k])), ...w.params]
    );
    return rows;
  },

  async remove(table, eq) {
    const w = where(eq);
    if (!w.sql) throw new Error('remove: where şərti boşdur (təhlükəsizlik)');
    await run(`delete from ${ident(table)}${w.sql}`, w.params);
  },
};

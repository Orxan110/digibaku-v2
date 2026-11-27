const { Pool } = require("pg");

const pool = globalThis.digibakuPool || new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true },
  max: 3,
  idleTimeoutMillis: 20000,
  connectionTimeoutMillis: 8000
});
globalThis.digibakuPool = pool;

// Vercel-də NEON_AUTH_URL təyin olunubsa o istifadə olunur, yoxsa default
const NEON_BASE = String(process.env.NEON_AUTH_URL || "https://ep-lively-math-betoma1f.neonauth.c-9.us-east-2.aws.neon.tech/neondb/auth").trim().replace(/\/+$/, "");
const JWKS_URL = NEON_BASE + "/.well-known/jwks.json";
let jwksCache = null;

// 1) JWT yoxlanışı
async function jwtPayload(token) {
  try {
    const jose = require("jose");
    if (!jwksCache) jwksCache = jose.createRemoteJWKSet(new URL(JWKS_URL));
    const { payload } = await jose.jwtVerify(token, jwksCache);
    return payload;
  } catch (e) {
    return null;
  }
}

// 2) Sessiya tokeni yoxlanışı: Neon-un get-session ünvanına Bearer ilə
async function sessionUser(token) {
  try {
    const r = await fetch(NEON_BASE + "/get-session", {
      headers: { Authorization: "Bearer " + token }
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j && j.user && j.user.id ? j.user : null;
  } catch (e) {
    return null;
  }
}

// Neon Auth panelində trusted olan ehtiyat origin ("Invalid origin" xətasının qarşısını alır)
const FALLBACK_ORIGIN = "https://digibaku-v2.vercel.app";

// Neon Auth-a göndərilən Origin. NEON_AUTH_ORIGIN təyin olunsa, həmişə o göndərilir.
function upstreamOrigin(req) {
  const forced = String(process.env.NEON_AUTH_ORIGIN || "").trim().replace(/\/+$/, "");
  if (forced) return forced;
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
  return req.headers.origin || ("https://" + host);
}

// 3) Cookie ilə yoxlanış
async function cookieUser(req) {
  const cookie = req.headers.cookie;
  if (!cookie) return null;
  try {
    const r = await fetch(NEON_BASE + "/get-session", {
      headers: {
        Cookie: cookie,
        Origin: upstreamOrigin(req),
        Accept: "application/json"
      }
    });
    if (!r.ok) return null;
    const j = await r.json();
    const u = j && j.user;
    return u && u.id ? { id: u.id, name: u.name || null, email: u.email || null } : null;
  } catch (e) {
    return null;
  }
}

async function bearerUser(token) {
  const p = await jwtPayload(token);
  if (p && p.sub) {
    let name = p.name || null, email = p.email || null;
    if (!name) {
      const u = await sessionUser(token);
      if (u) { name = u.name || null; email = email || u.email || null; }
    }
    return { id: p.sub, name: name, email: email };
  }
  const u = await sessionUser(token);
  return u ? { id: u.id, name: u.name || null, email: u.email || null } : null;
}

// İstifadəçi: { id, name, email } və ya null
async function getUserRaw(req) {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer\s+(.+)$/);
  if (m) {
    const u = await bearerUser(m[1].trim());
    if (u) return u;
  }
  return cookieUser(req);
}

// Bloklanmış (ban) hesab: sayta daxil ola bilməz, hesab sorğularına "daxil olmamış" kimi cavab verilir
async function getUser(req) {
  const u = await getUserRaw(req);
  if (!u) return null;
  try {
    const r = await pool.query("select blocked from customer_profiles where user_id = $1", [u.id]);
    if (r.rows[0] && r.rows[0].blocked === true) return null;
  } catch (e) {
    // cədvəl hələ yoxdursa ban yoxdur
  }
  return u;
}

async function getUserId(req) {
  const u = await getUser(req);
  return u ? u.id : null;
}

// Yeni cədvəl/sütunlar (təkrar işə düşməsi zərərsizdir)
async function ensureSchema() {
  if (globalThis.digibakuSchema) return globalThis.digibakuSchema;
  globalThis.digibakuSchema = (async () => {
    await pool.query(`create table if not exists product_content (
      product_key text primary key,
      about_az text, about_ru text, about_en text,
      usage_az text, usage_ru text, usage_en text,
      howto_az text, howto_ru text, howto_en text,
      updated_at timestamptz not null default now()
    )`);
    await pool.query("alter table reviews add column if not exists product_key text");
    await pool.query("alter table reviews add column if not exists user_id text");
    await pool.query("create index if not exists reviews_product_idx on reviews (product_key, status)");
  })().catch(function (e) { globalThis.digibakuSchema = null; throw e; });
  return globalThis.digibakuSchema;
}

module.exports = { pool, getUser, getUserId, ensureSchema, NEON_BASE, upstreamOrigin, FALLBACK_ORIGIN };

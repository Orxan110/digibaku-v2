const { Pool } = require("pg");

const pool = globalThis.digibakuPool || new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
  idleTimeoutMillis: 20000,
  connectionTimeoutMillis: 8000
});
globalThis.digibakuPool = pool;

const JWKS_URL = "https://ep-lively-math-betoma1f.neonauth.c-9.us-east-2.aws.neon.tech/neondb/auth/.well-known/jwks.json";
let jwksCache = null;

// Authorization: Bearer <token> başlığından istifadəçi ID-si (sub).
// jose yalnız sifariş yoxlanılanda yüklənir ki, məhsullar buna görə işləməsin.
async function getUserId(req) {
  try {
    const h = req.headers.authorization || "";
    const m = h.match(/^Bearer\s+(.+)$/);
    if (!m) return null;
    const jose = require("jose");
    if (!jwksCache) jwksCache = jose.createRemoteJWKSet(new URL(JWKS_URL));
    const { payload } = await jose.jwtVerify(m[1], jwksCache);
    return payload.sub || null;
  } catch (e) {
    return null;
  }
}
module.exports = { pool, getUserId };

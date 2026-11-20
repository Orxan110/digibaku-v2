const { Pool } = require("pg");

const pool = globalThis.digibakuPool || new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
  idleTimeoutMillis: 20000,
  connectionTimeoutMillis: 8000
});
globalThis.digibakuPool = pool;

const NEON_BASE = "https://ep-lively-math-betoma1f.neonauth.c-9.us-east-2.aws.neon.tech/neondb/auth";
const JWKS_URL = NEON_BASE + "/.well-known/jwks.json";
let jwksCache = null;

// 1) JWT yoxlanışı (token nöqtə ilə üç hissədən ibarətdirsə)
async function verifyJwt(token) {
  try {
    const jose = require("jose");
    if (!jwksCache) jwksCache = jose.createRemoteJWKSet(new URL(JWKS_URL));
    const { payload } = await jose.jwtVerify(token, jwksCache);
    return payload.sub || null;
  } catch (e) {
    return null;
  }
}

// 2) Sessiya tokeni yoxlanışı: Neon-un get-session ünvanına Bearer ilə
async function verifySession(token) {
  try {
    const r = await fetch(NEON_BASE + "/get-session", {
      headers: { Authorization: "Bearer " + token }
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j && j.user && j.user.id ? j.user.id : null;
  } catch (e) {
    return null;
  }
}

async function getUserId(req) {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer\s+(.+)$/);
  if (!m) return null;
  const token = m[1].trim();
  return (await verifyJwt(token)) || (await verifySession(token));
}

module.exports = { pool, getUserId };

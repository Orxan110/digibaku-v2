const { Pool } = require("pg");
const { createRemoteJWKSet, jwtVerify } = require("jose");

const pool = globalThis.digibakuPool || new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
  idleTimeoutMillis: 20000,
  connectionTimeoutMillis: 8000
});
globalThis.digibakuPool = pool;

const JWKS = createRemoteJWKSet(new URL(
  "https://ep-lively-math-betoma1f.neonauth.c-9.us-east-2.aws.neon.tech/neondb/auth/.well-known/jwks.json"
));

// Authorization: Bearer <token> başlığından istifadəçi ID-si (sub) götürülür
async function getUserId(req) {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer\s+(.+)$/);
  if (!m) return null;
  try {
    const { payload } = await jwtVerify(m[1], JWKS);
    return payload.sub || null;
  } catch (e) {
    return null;
  }
}
module.exports = { pool, getUserId };

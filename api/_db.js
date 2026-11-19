const { Pool } = require("pg");
const pool = globalThis.digibakuPool || new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
  idleTimeoutMillis: 20000,
  connectionTimeoutMillis: 8000
});
globalThis.digibakuPool = pool;

// Sessiya yoxlanışı: brauzerin cookie-si saytın öz /api/auth yolu üzərindən yoxlanır
async function getUserId(req) {
  if (!req.headers.cookie) return null;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  if (!host) return null;
  try {
    const r = await fetch("https://" + host + "/api/auth/get-session", {
      headers: { cookie: req.headers.cookie }
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j && j.user && j.user.id ? j.user.id : null;
  } catch (e) { return null; }
}
module.exports = { pool, getUserId };


const { Pool } = require("pg");
const pool = globalThis.digibakuPool || new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
  idleTimeoutMillis: 20000,
  connectionTimeoutMillis: 8000
});
globalThis.digibakuPool = pool;

// Sessiya yoxlanışı + diaqnostika
async function getSessionInfo(req) {
  const info = { hasCookie: !!req.headers.cookie, host: null, status: null, userId: null, note: null };
  if (!req.headers.cookie) { info.note = "cookie gəlmədi"; return info; }
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  info.host = host || null;
  if (!host) { info.note = "host yoxdur"; return info; }
  try {
    const r = await fetch("https://" + host + "/api/auth/get-session", {
      headers: { cookie: req.headers.cookie }
    });
    info.status = r.status;
    const text = await r.text();
    try {
      const j = JSON.parse(text);
      info.userId = j && j.user && j.user.id ? j.user.id : null;
      if (!info.userId) info.note = "JSON-da user yoxdur: " + text.slice(0, 200);
    } catch (e) {
      info.note = "JSON deyil: " + text.slice(0, 200);
    }
  } catch (e) {
    info.note = "fetch xətası: " + String(e && e.message || e);
  }
  return info;
}
module.exports = { pool, getSessionInfo };

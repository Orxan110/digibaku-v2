const { Pool } = require("pg");

const pool = globalThis.digibakuPool || new Pool({

connectionString: process.env.DATABASE_URL,

ssl: { rejectUnauthorized: false },

max: 3,

idleTimeoutMillis: 20000,

connectionTimeoutMillis: 8000

});

globalThis.digibakuPool = pool;

const AUTH_BASE = process.env.NEON_AUTH_URL ||

"https://ep-lively-math-betoma1f.neonauth.c-9.us-east-2.aws.neon.tech/neondb/auth";


// Cookie ilə sessiya yoxlanır. Qaytarır: user id (uuid) və ya null.

async function getUserId(req) {

if (!req.headers.cookie) return null;

try {

const r = await fetch(AUTH_BASE + "/get-session", {

headers: { cookie: req.headers.cookie }

});

if (!r.ok) return null;

const j = await r.json();

return j && j.user && j.user.id ? j.user.id : null;

} catch (e) { return null; }

}

module.exports = { pool, getUserId };


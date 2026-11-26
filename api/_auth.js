const crypto = require("crypto");
const { pool } = require("./_db");

function verify(token) {
  const secret = process.env.ADMIN_SECRET || "";
  if (!secret || !token || token.indexOf(".") < 0) return null;
  const parts = token.split(".");
  const data = parts[0], sig = parts[1] || "";
  const expect = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  const a = Buffer.from(sig), b = Buffer.from(expect);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let p;
  try { p = JSON.parse(Buffer.from(data, "base64url").toString()); } catch (e) { return null; }
  if (!p.exp || Date.now() > p.exp) return null;
  return p;
}

// Müştərinin real IP-si (Vercel bu başlıqları özü təyin edir)
function clientIp(req) {
  const h = req.headers || {};
  const raw = h["x-vercel-forwarded-for"] || h["x-real-ip"] || h["x-forwarded-for"] ||
    (req.socket && req.socket.remoteAddress) || "";
  return String(raw).split(",")[0].trim().slice(0, 64) || "?";
}

let secReady = null;
function ensureSecurity() {
  if (!secReady) {
    secReady = (async function () {
      await pool.query(`create table if not exists rate_limits (
        k text primary key, n integer not null default 0, window_start timestamptz not null default now())`);
      await pool.query(`create table if not exists admin_audit (
        id bigserial primary key, action text not null, detail text, ip text,
        created_at timestamptz not null default now())`);
    })().catch(function (e) { secReady = null; throw e; });
  }
  return secReady;
}

// Sabit pəncərəli limit. true = icazə var, false = limit aşılıb.
// Baza xətası olarsa sayt dayanmasın deyə icazə verir.
// failClosed=true olarsa baza xətasında icazə VERİLMİR (admin girişi üçün).
async function rateLimit(key, max, windowSec, failClosed) {
  try {
    await ensureSecurity();
    const r = await pool.query(
      `insert into rate_limits (k, n, window_start) values ($1, 1, now())
       on conflict (k) do update set
         n = case when rate_limits.window_start < now() - ($2::int * interval '1 second') then 1 else rate_limits.n + 1 end,
         window_start = case when rate_limits.window_start < now() - ($2::int * interval '1 second') then now() else rate_limits.window_start end
       returning n`, [String(key).slice(0, 120), windowSec]);
    if (Math.random() < 0.02) {
      pool.query("delete from rate_limits where window_start < now() - interval '1 day'").catch(function () {});
    }
    return r.rows[0].n <= max;
  } catch (e) {
    console.error("rateLimit:", e);
    return !failClosed;
  }
}

// Admin əməliyyat jurnalı (gizli məlumat yazılmır)
async function audit(action, detail, ip) {
  try {
    await ensureSecurity();
    await pool.query("insert into admin_audit (action, detail, ip) values ($1, $2, $3)",
      [String(action).slice(0, 60), detail ? String(detail).slice(0, 300) : null, ip || null]);
  } catch (e) {
    console.error("audit:", e);
  }
}

// Etibarlı URL: yalnız "/yol" (// olmadan) və ya https://. Boş = icazəli (null qaytarır), yanlış = false.
function safeUrl(v, max) {
  const s = String(v == null ? "" : v).trim();
  if (!s) return "";
  if (s.length > (max || 500)) return false;
  if (/[\s"'<>\\]/.test(s)) return false;
  if (s.charAt(0) === "/" && s.charAt(1) !== "/") return s;
  if (/^https:\/\/[^/]/i.test(s)) return s;
  return false;
}

// Admin yoxlaması. Uğursuzdursa cavab göndərir və null qaytarır.
function requireAdmin(req, res) {
  const h = req.headers.authorization || "";
  const p = verify(h.replace(/^Bearer\s+/i, "").trim());
  if (!p || p.role !== "admin") {
    res.status(401).json({ ok: false, error: "Admin girişi tələb olunur." });
    return null;
  }
  return p;
}

module.exports = { verify, clientIp, rateLimit, audit, ensureSecurity, safeUrl, requireAdmin };

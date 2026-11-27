const { pool, getUser, ensureSchema, NEON_BASE, upstreamOrigin, FALLBACK_ORIGIN } = require("./_db");
const { rateLimit, clientIp, sameOrigin } = require("./_auth");
const { ensureCustomerTables } = require("../lib/customers");
const { expiringSql } = require("../lib/subs");

function body(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  return req.body;
}

// Neon-un cookie-sini saytın öz domeninə bağlayır və təhlükəsizlik bayraqlarını məcburi edir
function fixCookie(c) {
  let s = c.replace(/;\s*Domain=[^;]*/ig, "");
  if (!/;\s*Secure(;|$)/i.test(s)) s += "; Secure";
  if (!/;\s*HttpOnly(;|$)/i.test(s)) s += "; HttpOnly";
  if (!/;\s*SameSite=/i.test(s)) s += "; SameSite=Lax";
  if (!/;\s*Path=/i.test(s)) s += "; Path=/";
  return s;
}

// Oxuna bilən (HttpOnly olmayan) giriş ipucu cookie-si: səhifə yenilənəndə "Daxil ol/Qeydiyyat" yanıb-sönməsinin qarşısını alır.
// Həssas məlumat deyil, yalnız "1" saxlayır. Əsl sessiya HttpOnly cookie-dədir.
const HINT = "digibaku_auth";
function hintSet() { return HINT + "=1; Path=/; Max-Age=2592000; Secure; SameSite=Lax"; }
function hintClear() { return HINT + "=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; SameSite=Lax"; }

// Çıxışda brauzerdəki bütün auth/sessiya cookie-lərini serverdən vaxtı bitmiş kimi göndərir
// (Neon cavabı xəta qaytarsa və ya cookie adı fərqli olsa belə sessiya silinsin).
function expireAuthCookies(req) {
  const out = [];
  String(req.headers.cookie || "").split(";").forEach(function (part) {
    const name = part.split("=")[0].trim();
    if (!name || name === HINT) return;
    if (!/(neon|better-auth|session|auth)/i.test(name)) return;
    ["/", "/api", "/api/auth"].forEach(function (path) {
      out.push(name + "=; Path=" + path + "; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; HttpOnly; SameSite=Lax");
    });
  });
  return out;
}

// Yalnız saytın istifadə etdiyi (və təhlükəsiz) auth ünvanlarına icazə verilir
const AUTH_ALLOW = /^(sign-up\/email|sign-in\/email|sign-out|get-session|token|forget-password|request-password-reset|reset-password|verify-email|send-verification-email|ok|update-user|change-email|change-password)$/;

async function authProxy(req, res) {
  res.setHeader("Cache-Control", "no-store");
  let rawPath = String((req.query && req.query.p) || "");
  if (!rawPath) {
    // Rewrite parametri gəlməyibsə, ünvandan götür
    const m = String(req.url || "").match(/\/api\/auth\/([^?]*)/);
    if (m) rawPath = decodeURIComponent(m[1]);
  }
  const path = rawPath.replace(/^\/+|\/+$/g, "");
  if (!AUTH_ALLOW.test(path)) {
    return res.status(404).json({ message: "Not found" });
  }
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();

  // CSRF: dəyişdirən sorğuda Origin varsa, yalnız öz saytımızdan olmalıdır
  if (req.method !== "GET" && req.method !== "HEAD" && req.headers.origin) {
    let oh = "";
    try { oh = new URL(req.headers.origin).host; } catch (e) {}
    if (oh !== host) return res.status(403).json({ message: "Forbidden" });
  }

  // Brute-force / spam qeydiyyat limiti (IP üzrə)
  const ip = clientIp(req);
  if (req.method === "POST") {
    let ok = true;
    if (path === "sign-in/email") ok = await rateLimit("auth-in:" + ip, 20, 600);
    else if (path === "sign-up/email") ok = await rateLimit("auth-up:" + ip, 10, 3600);
    else if (/password|verif/.test(path) && path !== "change-password") ok = await rateLimit("auth-pw:" + ip, 5, 3600);
    else if (path === "change-password" || path === "change-email") ok = await rateLimit("auth-chg:" + ip, 10, 3600);
    if (!ok) return res.status(429).json({ message: "Çox cəhd edildi. Bir az sonra yenidən yoxlayın." });
  }

  const qs = new URLSearchParams();
  Object.keys(req.query || {}).forEach(function (k) {
    if (k === "p" || k === "action") return;
    [].concat(req.query[k]).forEach(function (v) { qs.append(k, v); });
  });
  const url = NEON_BASE + "/" + path + (qs.toString() ? "?" + qs.toString() : "");

  const h = { Accept: "application/json", Origin: upstreamOrigin(req), "X-Forwarded-For": ip };
  if (req.headers["user-agent"]) h["User-Agent"] = req.headers["user-agent"];
  if (req.headers.cookie) h.Cookie = req.headers.cookie;
  if (req.headers.authorization) h.Authorization = req.headers.authorization;
  let payload;
  if (req.method !== "GET" && req.method !== "HEAD") {
    h["Content-Type"] = "application/json";
    payload = typeof req.body === "string" ? req.body : JSON.stringify(req.body || {});
    if (payload.length > 10000) return res.status(413).json({ message: "Too large" });
  }

  let up, text;
  try {
    up = await fetch(url, { method: req.method, headers: h, body: payload, redirect: "manual", signal: AbortSignal.timeout(15000) });
    text = await up.text();
    // "Invalid origin" (403): domen Neon Auth-da trusted deyil -> trusted ehtiyat origin ilə təkrar
    if (up.status === 403 && /invalid origin/i.test(text) && h.Origin !== FALLBACK_ORIGIN) {
      console.warn("auth proxy: Invalid origin for", h.Origin, "- retry with fallback");
      h.Origin = FALLBACK_ORIGIN;
      up = await fetch(url, { method: req.method, headers: h, body: payload, redirect: "manual", signal: AbortSignal.timeout(15000) });
      text = await up.text();
    }
  } catch (e) {
    console.error("auth proxy:", e);
    return res.status(502).json({ message: "Auth serveri ilə əlaqə yoxdur." });
  }
  const sc = up.headers.getSetCookie ? up.headers.getSetCookie() : [];
  let cookies = sc.map(fixCookie);
  if (path === "sign-out") {
    // Neon nə cavab versə də brauzerdə sessiya cookie-ləri silinir
    cookies = cookies.concat(expireAuthCookies(req), [hintClear()]);
  } else if ((path === "sign-in/email" || path === "sign-up/email") && up.status >= 200 && up.status < 300) {
    cookies.push(hintSet());
  } else if (path === "get-session") {
    // Sessiya yoxlanışı hint cookie-ni həmişə həqiqətə uyğunlaşdırır (köhnə/ilişmiş hint qalmır)
    let hasUser = false;
    if (up.status >= 200 && up.status < 300) { try { const j = JSON.parse(text); hasUser = !!(j && j.user); } catch (e) {} }
    if (hasUser) cookies.push(hintSet());
    else if (up.status < 500) cookies.push(hintClear());
  }
  if (cookies.length) res.setHeader("Set-Cookie", cookies);
  const ct = up.headers.get("content-type");
  if (ct) res.setHeader("Content-Type", ct);
  if (path === "sign-out") {
    res.setHeader("Content-Type", "application/json");
    return res.status(200).send(JSON.stringify({ success: true }));
  }
  return res.status(up.status).send(text);
}

async function findProduct(key) {
  const r = await pool.query(
    "select product_key from site_products where active = true and (product_key = $1 or slug = $1) limit 1",
    [key]);
  return r.rows[0] ? r.rows[0].product_key : null;
}

async function extra(req, res) {
  res.setHeader("Cache-Control", "public, s-maxage=10, stale-while-revalidate=60");
  const key = String((req.query && req.query.product) || "").trim();
  if (!key) return res.status(400).json({ ok: false, error: "Məhsul göstərilməyib." });
  try {
    await ensureSchema();
    const pk = await findProduct(key);
    if (!pk) return res.status(404).json({ ok: false, error: "Məhsul tapılmadı." });
    const c = await pool.query("select * from product_content where product_key = $1", [pk]);
    const row = c.rows[0] || {};
    const content = {};
    ["about", "usage", "howto"].forEach(function (k) {
      content[k] = { az: row[k + "_az"] || "", ru: row[k + "_ru"] || "", en: row[k + "_en"] || "" };
    });
    const rv = await pool.query(
      `select author_name, rating, body_az, body_ru, body_en, review_date
       from reviews where product_key = $1 and status = 'approved'
       order by review_date desc, created_at desc limit 50`, [pk]);
    const st = await pool.query(
      `select count(*)::int as c, coalesce(round(avg(rating)::numeric, 1), 0)::float as a
       from reviews where product_key = $1 and status = 'approved'`, [pk]);
    return res.status(200).json({
      ok: true, content: content, reviews: rv.rows,
      stats: { count: st.rows[0].c, avg: st.rows[0].a }
    });
  } catch (e) {
    console.error("shop extra:", e);
    return res.status(500).json({ ok: false, error: "Məlumat yüklənmədi." });
  }
}

async function review(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });
  if (!sameOrigin(req)) return res.status(403).json({ ok: false, error: "Forbidden" });
  const user = await getUser(req);
  if (!user) return res.status(401).json({ ok: false, error: "Rəy yazmaq üçün daxil olun." });
  if (!(await rateLimit("review:" + user.id, 5, 3600))) return res.status(429).json({ ok: false, error: "Çox tez-tez göndərirsiniz. Bir az gözləyin." });
  const b = body(req);
  const text = String(b.body || "").trim();
  const rating = parseInt(b.rating, 10);
  if (!(rating >= 1 && rating <= 5)) return res.status(400).json({ ok: false, error: "Reytinq seçin (1–5)." });
  if (text.length < 5) return res.status(400).json({ ok: false, error: "Rəy çox qısadır." });
  if (text.length > 1000) return res.status(400).json({ ok: false, error: "Rəy 1000 simvoldan uzun ola bilməz." });
  try {
    await ensureSchema();
    const pk = await findProduct(String(b.product || "").trim());
    if (!pk) return res.status(404).json({ ok: false, error: "Məhsul tapılmadı." });
    const dup = await pool.query("select 1 from reviews where user_id = $1 and product_key = $2 limit 1", [user.id, pk]);
    if (dup.rowCount) return res.status(409).json({ ok: false, error: "Bu məhsul üçün artıq rəy göndərmisiniz." });
    const name = String(user.name || "").trim().slice(0, 60) || "Müştəri";
    await pool.query(
      `insert into reviews (author_name, rating, body_az, review_date, status, show_on_home, source, product_key, user_id)
       values ($1, $2, $3, current_date, 'pending', false, 'customer', $4, $5)`,
      [name, rating, text, pk, user.id]);
    return res.status(201).json({ ok: true });
  } catch (e) {
    console.error("shop review:", e);
    return res.status(500).json({ ok: false, error: "Rəy göndərilmədi." });
  }
}

// Sevimlilər: GET → istifadəçinin product_key siyahısı; POST {product_key, on} → əlavə/silmə
let wishReady = null;
function ensureWishTable() {
  if (!wishReady) {
    wishReady = pool.query(`create table if not exists wishlist (
        user_id text not null,
        product_key text not null,
        created_at timestamptz not null default now(),
        primary key (user_id, product_key))`)
      .catch(function (e) { wishReady = null; throw e; });
  }
  return wishReady;
}

async function wishlist(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const user = await getUser(req);
  if (!user) return res.status(401).json({ ok: false, error: "Sevimlilər üçün daxil olun." });
  try {
    await ensureWishTable();
    if (req.method === "GET") {
      const r = await pool.query(
        "select product_key from wishlist where user_id = $1 order by created_at desc", [user.id]);
      return res.status(200).json({ ok: true, keys: r.rows.map(function (x) { return x.product_key; }) });
    }
    if (req.method === "POST") {
      if (!sameOrigin(req)) return res.status(403).json({ ok: false, error: "Forbidden" });
      if (!(await rateLimit("wish:" + user.id, 120, 3600))) {
        return res.status(429).json({ ok: false, error: "Çox tez-tez dəyişirsiniz. Bir az gözləyin." });
      }
      const b = body(req);
      const key = await findProduct(String(b.product_key || "").trim().slice(0, 100));
      if (!key) return res.status(404).json({ ok: false, error: "Məhsul tapılmadı." });
      const on = b.on === true || b.on === "true";
      if (on) {
        await pool.query(
          "insert into wishlist (user_id, product_key) values ($1, $2) on conflict do nothing", [user.id, key]);
      } else {
        await pool.query("delete from wishlist where user_id = $1 and product_key = $2", [user.id, key]);
      }
      return res.status(200).json({ ok: true, on: on, product_key: key });
    }
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (e) {
    console.error("wishlist:", e);
    return res.status(500).json({ ok: false, error: "Sevimlilər yadda saxlanmadı." });
  }
}

// Müştərinin öz bitməyə yaxın abunələri (sayt içində bildiriş)
async function expiring(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const user = await getUser(req);
  if (!user) return res.status(401).json({ ok: false, error: "Daxil olun." });
  try {
    await ensureCustomerTables(pool);
    const r = await pool.query(expiringSql(true), [user.id]);
    return res.status(200).json({ ok: true, items: r.rows.map(function (x) {
      return { product_key: x.product_key, name: x.name, ends_at: x.ends_at };
    }) });
  } catch (e) {
    console.error("expiring:", e);
    return res.status(500).json({ ok: false, error: "Bildirişlər yüklənmədi." });
  }
}

// Ziyarətçi sayı: hər cihaz gündə bir dəfə (anonim vid). Giriş edilibsə, hesaba da bağlanır. IP saxlanmır.
let visitsReady = null;
function ensureVisitsTable() {
  if (!visitsReady) {
    visitsReady = (async function () {
      await pool.query(`create table if not exists site_visitors (
        day date not null,
        visitor_id text not null,
        primary key (day, visitor_id))`);
      await pool.query("alter table site_visitors add column if not exists user_id text");
      await pool.query("alter table site_visitors add column if not exists ip text");
    })().catch(function (e) { visitsReady = null; throw e; });
  }
  return visitsReady;
}

async function visit(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  try {
    const b = body(req);
    const vid = String(b.vid || "");
    if (!/^[A-Za-z0-9_-]{16,64}$/.test(vid)) return res.status(400).json({ ok: false });
    await ensureVisitsTable();
    const user = await getUser(req);
    const ip = clientIp(req);
    await pool.query(
      `insert into site_visitors (day, visitor_id, user_id, ip)
       values ((now() at time zone 'Asia/Baku')::date, $1, $2, $3)
       on conflict (day, visitor_id) do update
         set user_id = coalesce(excluded.user_id, site_visitors.user_id), ip = excluded.ip`,
      [vid, user ? String(user.id) : null, ip]);
    if (user) {
      await ensureCustomerTables(pool);
      await pool.query(
        `insert into customer_profiles (user_id, last_ip) values ($1, $2)
         on conflict (user_id) do update set last_ip = excluded.last_ip`,
        [String(user.id), ip]);
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("visit:", e);
    return res.status(500).json({ ok: false });
  }
}

// Ban siyahısı: middleware bu endpoint-dən IP-ləri oxuyur (yalnız IP-lər qaytarılır)
async function bansList(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    await ensureCustomerTables(pool);
    const r = await pool.query("select ip from banned_ips");
    return res.status(200).json({ ips: r.rows.map(function (x) { return x.ip; }) });
  } catch (e) {
    console.error("bans:", e);
    return res.status(500).json({ ips: [] });
  }
}

// Müştərinin öz balansı (yalnız oxumaq üçün)
async function balanceGet(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const user = await getUser(req);
  if (!user) return res.status(401).json({ ok: false, error: "Daxil olun." });
  const uid = String(user.id);
  try {
    try { await ensureCustomerTables(pool); } catch (e) { console.error("balance ensure:", e && e.message); }
    const r = await pool.query("select balance from customer_profiles where user_id = $1", [uid]);
    let ledger = [];
    try {
      const l = await pool.query(
        `select amount, reason, created_at from customer_ledger
         where user_id = $1 order by created_at desc limit 50`, [uid]);
      ledger = l.rows.map(function (x) { return { amount: Number(x.amount), reason: x.reason, created_at: x.created_at }; });
    } catch (e) { console.error("balance ledger:", e && e.message); }
    return res.status(200).json({
      ok: true,
      balance: r.rows[0] ? Number(r.rows[0].balance) : 0,
      ledger: ledger
    });
  } catch (e) {
    console.error("balance:", e);
    return res.status(500).json({ ok: false });
  }
}

module.exports = async function handler(req, res) {
  const action = (req.query && req.query.action) || "";
  if (action === "auth") return authProxy(req, res);
  if (action === "extra" && req.method === "GET") return extra(req, res);
  if (action === "review") return review(req, res);
  if (action === "wish") return wishlist(req, res);
  if (action === "visit") return visit(req, res);
  if (action === "bans" && req.method === "GET") return bansList(req, res);
  if (action === "balance" && req.method === "GET") return balanceGet(req, res);
  if (action === "expiring" && req.method === "GET") return expiring(req, res);
  return res.status(400).json({ ok: false, error: "Naməlum əməliyyat." });
};

const { pool, getUser, ensureSchema, NEON_BASE } = require("./_db");
const { rateLimit, clientIp } = require("./_auth");

function body(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  return req.body;
}

function fixCookie(c) {
  return c.replace(/;\s*Domain=[^;]*/ig, "");
}

// Yalnız saytın istifadə etdiyi (və təhlükəsiz) auth ünvanlarına icazə verilir
const AUTH_ALLOW = /^(sign-up\/email|sign-in\/email|sign-out|get-session|token|forget-password|request-password-reset|reset-password|verify-email|send-verification-email)$/;

async function authProxy(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const path = String(req.query.p || "").replace(/^\/+|\/+$/g, "");
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
    if (path === "sign-in/email") ok = await rateLimit("auth-in:" + ip, 10, 600);
    else if (path === "sign-up/email") ok = await rateLimit("auth-up:" + ip, 5, 3600);
    else if (/password|verif/.test(path)) ok = await rateLimit("auth-pw:" + ip, 5, 3600);
    if (!ok) return res.status(429).json({ message: "Çox cəhd edildi. Bir az sonra yenidən yoxlayın." });
  }

  const qs = new URLSearchParams();
  Object.keys(req.query || {}).forEach(function (k) {
    if (k === "p" || k === "action") return;
    [].concat(req.query[k]).forEach(function (v) { qs.append(k, v); });
  });
  const url = NEON_BASE + "/" + path + (qs.toString() ? "?" + qs.toString() : "");

  const h = { Accept: "application/json", Origin: req.headers.origin || ("https://" + host) };
  if (req.headers.cookie) h.Cookie = req.headers.cookie;
  if (req.headers.authorization) h.Authorization = req.headers.authorization;
  let payload;
  if (req.method !== "GET" && req.method !== "HEAD") {
    h["Content-Type"] = "application/json";
    payload = typeof req.body === "string" ? req.body : JSON.stringify(req.body || {});
    if (payload.length > 10000) return res.status(413).json({ message: "Too large" });
  }

  let up;
  try {
    up = await fetch(url, { method: req.method, headers: h, body: payload, redirect: "manual" });
  } catch (e) {
    console.error("auth proxy:", e);
    return res.status(502).json({ message: "Auth serveri ilə əlaqə yoxdur." });
  }
  const text = await up.text();
  const sc = up.headers.getSetCookie ? up.headers.getSetCookie() : [];
  if (sc.length) res.setHeader("Set-Cookie", sc.map(fixCookie));
  const ct = up.headers.get("content-type");
  if (ct) res.setHeader("Content-Type", ct);
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

module.exports = async function handler(req, res) {
  const action = (req.query && req.query.action) || "";
  if (action === "auth") return authProxy(req, res);
  if (action === "extra" && req.method === "GET") return extra(req, res);
  if (action === "review") return review(req, res);
  return res.status(400).json({ ok: false, error: "Naməlum əməliyyat." });
};

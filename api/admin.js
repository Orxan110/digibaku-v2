const crypto = require("crypto");
const { pool } = require("./_db");

const STATUSES = ["pending", "confirmed", "processing", "completed", "cancelled"];
const MONTHS = [1, 2, 3, 6, 12];

function body(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  return req.body;
}

function sign(payload) {
  const secret = process.env.ADMIN_SECRET || "";
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return data + "." + sig;
}

function verify(token) {
  const secret = process.env.ADMIN_SECRET || "";
  if (!secret || !token || token.indexOf(".") < 0) return null;
  const parts = token.split(".");
  const data = parts[0], sig = parts[1];
  const expect = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  const a = Buffer.from(sig), b = Buffer.from(expect);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let p;
  try { p = JSON.parse(Buffer.from(data, "base64url").toString()); } catch (e) { return null; }
  if (!p.exp || Date.now() > p.exp) return null;
  return p;
}

function safeEq(x, y) {
  const a = Buffer.from(String(x)), b = Buffer.from(String(y));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Boş dəyər -> null; rəqəm -> 2 onluq; yanlış/mənfi -> NaN
function num(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return NaN;
  return Math.round(n * 100) / 100;
}

function txt(v) {
  const s = String(v == null ? "" : v).trim();
  return s ? s : null;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const action = (req.query && req.query.action) || "";

  if (req.method === "POST" && action === "login") {
    const pass = process.env.ADMIN_PASSWORD || "";
    if (!pass || !process.env.ADMIN_SECRET) {
      return res.status(500).json({ ok: false, error: "ADMIN_PASSWORD və ya ADMIN_SECRET Vercel-də təyin olunmayıb." });
    }
    const b = body(req);
    if (!safeEq(b.password || "", pass)) return res.status(401).json({ ok: false, error: "Şifrə yanlışdır." });
    const token = sign({ role: "admin", exp: Date.now() + 12 * 60 * 60 * 1000 });
    return res.status(200).json({ ok: true, token: token });
  }

  const h = req.headers.authorization || "";
  const p = verify(h.replace(/^Bearer\s+/i, "").trim());
  if (!p || p.role !== "admin") return res.status(401).json({ ok: false, error: "Admin girişi tələb olunur." });

  if (req.method === "GET" && action === "me") {
    return res.status(200).json({ ok: true, isAdmin: true });
  }

  if (req.method === "GET" && action === "orders") {
    const r = await pool.query(
      `select o.id, o.total, o.status, o.items, o.created_at, u.email
       from orders o left join neon_auth."user" u on u.id = o.user_id
       order by o.created_at desc limit 200`);
    return res.status(200).json({ ok: true, orders: r.rows });
  }

  if (req.method === "POST" && action === "order_status") {
    const b = body(req);
    if (!STATUSES.includes(b.status)) return res.status(400).json({ ok: false, error: "Status yanlışdır." });
    const r = await pool.query(
      "update orders set status = $1, updated_at = now() where id = $2 returning id, status",
      [b.status, String(b.id)]);
    if (!r.rowCount) return res.status(404).json({ ok: false, error: "Sifariş tapılmadı." });
    return res.status(200).json({ ok: true, order: r.rows[0] });
  }

  if (req.method === "GET" && action === "products") {
    const cats = await pool.query(
      "select key, name_az from categories order by sort_order, name_az");
    const prods = await pool.query(
      `select p.product_key, p.name_az, p.name_ru, p.name_en, p.category_key, p.image_url, p.active, p.sort_order,
              pp.price_1_month, pp.price_2_month, pp.price_3_month, pp.price_6_month, pp.price_12_month,
              pp.sale_1_price, pp.sale_2_price, pp.sale_3_price, pp.sale_6_price, pp.sale_12_price,
              pp.sale_1_active, pp.sale_2_active, pp.sale_3_active, pp.sale_6_active, pp.sale_12_active
       from site_products p
       left join product_prices pp on pp.product_key = p.product_key
       order by p.sort_order, p.name_az`);
    return res.status(200).json({ ok: true, categories: cats.rows, products: prods.rows });
  }

  if (req.method === "POST" && action === "product_save") {
    const b = body(req);
    const key = String(b.product_key || "");
    const nameAz = txt(b.name_az);
    if (!key) return res.status(400).json({ ok: false, error: "Məhsul açarı yoxdur." });
    if (!nameAz) return res.status(400).json({ ok: false, error: "Azərbaycanca ad daxil edin." });
    const r = await pool.query(
      `update site_products
       set name = $2, name_az = $2, name_ru = $3, name_en = $4, category_key = $5,
           image_url = $6, active = $7, sort_order = $8
       where product_key = $1 returning product_key`,
      [key, nameAz, txt(b.name_ru), txt(b.name_en), txt(b.category_key), txt(b.image_url),
       !!b.active, parseInt(b.sort_order, 10) || 0]);
    if (!r.rowCount) return res.status(404).json({ ok: false, error: "Məhsul tapılmadı." });
    return res.status(200).json({ ok: true });
  }

  if (req.method === "POST" && action === "price_save") {
    const b = body(req);
    const key = String(b.product_key || "");
    const prices = b.prices || {};
    if (!key) return res.status(400).json({ ok: false, error: "Məhsul açarı yoxdur." });

    const exists = await pool.query("select 1 from site_products where product_key = $1", [key]);
    if (!exists.rowCount) return res.status(404).json({ ok: false, error: "Məhsul tapılmadı." });

    const cols = [];
    const vals = [];
    for (const m of MONTHS) {
      const row = prices[m] || {};
      const price = num(row.price);
      const sale = num(row.sale);
      if (Number.isNaN(price) || Number.isNaN(sale)) {
        return res.status(400).json({ ok: false, error: "Qiymət mənfi və ya düzgün olmayan rəqəmdir (" + m + " ay)." });
      }
      const saleOn = !!row.saleActive && sale !== null && sale > 0;
      cols.push("price_" + m + "_month", "sale_" + m + "_price", "sale_" + m + "_active");
      vals.push(price, sale, saleOn);
    }

    const sets = cols.map((c, i) => c + " = $" + (i + 2)).join(", ");
    const upd = await pool.query(
      "update product_prices set " + sets + ", updated_at = now() where product_key = $1 returning product_key",
      [key].concat(vals));
    if (!upd.rowCount) {
      const ph = cols.map((c, i) => "$" + (i + 3)).join(", ");
      await pool.query(
        "insert into product_prices (product_key, product_name, " + cols.join(", ") + ") " +
        "values ($1, (select name_az from site_products where product_key = $1), " + ph + ")",
        [key].concat(vals));
    }
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ ok: false, error: "Naməlum əməliyyat." });
};

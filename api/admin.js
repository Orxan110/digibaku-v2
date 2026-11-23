const crypto = require("crypto");
const { pool } = require("./_db");

const IMG_RE = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+\/=]+)$/;
const IMG_MAX_BYTES = 2 * 1024 * 1024;
let imagesReady = null;
async function ensureImages() {
  if (!imagesReady) {
    imagesReady = pool.query(
      `create table if not exists product_images (
         id text primary key, mime text not null, data bytea not null,
         created_at timestamptz not null default now())`
    ).catch(function (e) { imagesReady = null; throw e; });
  }
  return imagesReady;
}

const STATUSES = ["pending", "confirmed", "processing", "completed", "cancelled"];
const MONTHS = [1, 2, 3, 6, 12];
const CAT_KEY_RE = /^[a-z0-9_]{2,40}$/;
const FAQ_LANGS = ["az", "ru", "en"];
const loginTries = globalThis.digibakuLoginTries || new Map();
globalThis.digibakuLoginTries = loginTries;

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
    const adminEmail = String(process.env.ADMIN_EMAIL || "zahidovorxan989@gmail.com").trim().toLowerCase();
    if (!pass || !process.env.ADMIN_SECRET) {
      return res.status(500).json({ ok: false, error: "ADMIN_PASSWORD və ya ADMIN_SECRET Vercel-də təyin olunmayıb." });
    }
    const ip = String((req.headers["x-forwarded-for"] || req.socket.remoteAddress || "")).split(",")[0].trim() || "?";
    const rec = loginTries.get(ip) || { n: 0, until: 0 };
    if (Date.now() < rec.until) {
      return res.status(429).json({ ok: false, error: "Çox sayda uğursuz cəhd. Bir az sonra yenidən yoxlayın." });
    }
    const b = body(req);
    // Hər iki sahə həmişə yoxlanır (hansının səhv olduğu bilinməsin)
    const okEmail = safeEq(String(b.email || "").trim().toLowerCase(), adminEmail);
    const okPass = safeEq(b.password || "", pass);
    if (!(okEmail && okPass)) {
      rec.n += 1;
      if (rec.n >= 5) { rec.until = Date.now() + 15 * 60 * 1000; rec.n = 0; }
      loginTries.set(ip, rec);
      await new Promise(function (r) { setTimeout(r, 700); });
      return res.status(401).json({ ok: false, error: "E-poçt və ya şifrə yanlışdır." });
    }
    loginTries.delete(ip);
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
  if (req.method === "GET" && action === "customers") {
    const r = await pool.query(
      `select u.id, u.name, u.email,
              count(o.id)::int as order_count,
              coalesce(sum(o.total) filter (where o.status <> 'cancelled'), 0) as total_spent,
              max(o.created_at) as last_order
       from neon_auth."user" u
       left join orders o on o.user_id = u.id
       group by u.id, u.name, u.email
       order by max(o.created_at) desc nulls last, u.email
       limit 500`);
    return res.status(200).json({ ok: true, customers: r.rows });
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
    const cats = await pool.query("select key, name_az from categories order by sort_order, name_az");
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
           image_url = $6, active = $7, sort_order = coalesce($8, sort_order)
       where product_key = $1 returning product_key`,
      [key, nameAz, txt(b.name_ru), txt(b.name_en), txt(b.category_key), txt(b.image_url),
       !!b.active, Number.isFinite(parseInt(b.sort_order, 10)) ? parseInt(b.sort_order, 10) : null]);
    if (!r.rowCount) return res.status(404).json({ ok: false, error: "Məhsul tapılmadı." });
    return res.status(200).json({ ok: true });
  }

  if (req.method === "POST" && action === "product_reorder") {
    const b = body(req);
    const order = Array.isArray(b.order) ? b.order.map(String).slice(0, 500) : [];
    if (!order.length) return res.status(400).json({ ok: false, error: "Sıra boşdur." });
    const client = await pool.connect();
    try {
      await client.query("begin");
      for (let i = 0; i < order.length; i++) {
        await client.query("update site_products set sort_order = $2 where product_key = $1", [order[i], (i + 1) * 10]);
      }
      await client.query("commit");
    } catch (e) {
      await client.query("rollback").catch(function () {});
      console.error("product_reorder:", e);
      return res.status(500).json({ ok: false, error: "Sıra yadda saxlanmadı." });
    } finally {
      client.release();
    }
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

  // ---------- KATEQORİYALAR ----------
  if (req.method === "GET" && action === "categories") {
    const r = await pool.query(
      "select key, name_az, name_ru, name_en, icon, sort_order, active from categories order by sort_order, name_az");
    return res.status(200).json({ ok: true, categories: r.rows });
  }

  if (req.method === "POST" && action === "category_save") {
    const b = body(req);
    const key = String(b.key || "").trim();
    const nameAz = txt(b.name_az);
    if (!nameAz) return res.status(400).json({ ok: false, error: "Azərbaycanca ad daxil edin." });
    const sort = parseInt(b.sort_order, 10) || 0;
    const upd = await pool.query(
      `update categories set name_az = $2, name_ru = $3, name_en = $4, icon = $5, sort_order = $6, active = $7
       where key = $1 returning key`,
      [key, nameAz, txt(b.name_ru), txt(b.name_en), txt(b.icon), sort, !!b.active]);
    if (upd.rowCount) return res.status(200).json({ ok: true });
    if (!CAT_KEY_RE.test(key)) {
      return res.status(400).json({ ok: false, error: "Açar yalnız kiçik latın hərfi, rəqəm və _ ola bilər (2–40 simvol)." });
    }
    await pool.query(
      `insert into categories (key, name_az, name_ru, name_en, icon, sort_order, active)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [key, nameAz, txt(b.name_ru), txt(b.name_en), txt(b.icon), sort, !!b.active]);
    return res.status(200).json({ ok: true });
  }

  // ---------- FAQ ----------
  if (req.method === "GET" && action === "faqs") {
    const r = await pool.query(
      "select id, question, answer, language, sort_order, active from site_faqs order by language, sort_order, created_at");
    return res.status(200).json({ ok: true, faqs: r.rows });
  }

  if (req.method === "POST" && action === "faq_save") {
    const b = body(req);
    const lang = String(b.language || "az");
    const q = txt(b.question);
    const a = txt(b.answer);
    if (!FAQ_LANGS.includes(lang)) return res.status(400).json({ ok: false, error: "Dil yanlışdır." });
    if (!q || !a) return res.status(400).json({ ok: false, error: "Sual və cavab daxil edin." });
    const sort = parseInt(b.sort_order, 10) || 0;
    if (b.id) {
      const r = await pool.query(
        `update site_faqs set question = $2, answer = $3, language = $4, sort_order = $5, active = $6
         where id = $1 returning id`,
        [String(b.id), q, a, lang, sort, !!b.active]);
      if (!r.rowCount) return res.status(404).json({ ok: false, error: "Sual tapılmadı." });
      return res.status(200).json({ ok: true, id: r.rows[0].id });
    }
    const r = await pool.query(
      `insert into site_faqs (question, answer, language, sort_order, active)
       values ($1, $2, $3, $4, $5) returning id`,
      [q, a, lang, sort, !!b.active]);
    return res.status(200).json({ ok: true, id: r.rows[0].id });
  }

  if (req.method === "POST" && action === "faq_delete") {
    const b = body(req);
    const r = await pool.query("delete from site_faqs where id = $1 returning id", [String(b.id || "")]);
    if (!r.rowCount) return res.status(404).json({ ok: false, error: "Sual tapılmadı." });
    return res.status(200).json({ ok: true });
  }

  // ---------- ŞƏKİL YÜKLƏMƏ ----------
  if (req.method === "POST" && action === "image_upload") {
    const b = body(req);
    const m = IMG_RE.exec(String(b.data || ""));
    if (!m) return res.status(400).json({ ok: false, error: "Yalnız JPG, PNG və ya WEBP şəkil yükləyin." });
    const buf = Buffer.from(m[2], "base64");
    if (!buf.length) return res.status(400).json({ ok: false, error: "Şəkil boşdur." });
    if (buf.length > IMG_MAX_BYTES) return res.status(413).json({ ok: false, error: "Şəkil çox böyükdür (maksimum 2 MB)." });
    await ensureImages();
    const id = crypto.randomBytes(16).toString("hex");
    await pool.query("insert into product_images (id, mime, data) values ($1, $2, $3)", [id, m[1], buf]);
    return res.status(200).json({ ok: true, url: "/img/" + id });
  }

  // ---------- YENİ MƏHSUL ----------
  if (req.method === "POST" && action === "product_create") {
    const b = body(req);
    const slug = String(b.slug || "").trim().toLowerCase();
    const nameAz = txt(b.name_az);
    if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(slug)) {
      return res.status(400).json({ ok: false, error: "Link adı yalnız kiçik latın hərfi, rəqəm və - ola bilər (2–80 simvol)." });
    }
    if (!nameAz) return res.status(400).json({ ok: false, error: "Azərbaycanca ad daxil edin." });
    const cat = txt(b.category_key);
    if (cat) {
      const c = await pool.query("select 1 from categories where key = $1", [cat]);
      if (!c.rowCount) return res.status(400).json({ ok: false, error: "Kateqoriya tapılmadı." });
    }
    const img = txt(b.image_url);
    if (img && !(img.charAt(0) === "/" || /^https:\/\//.test(img))) {
      return res.status(400).json({ ok: false, error: "Şəkil linki yanlışdır." });
    }
    const dup = await pool.query("select 1 from site_products where product_key = $1 or slug = $1", [slug]);
    if (dup.rowCount) return res.status(409).json({ ok: false, error: "Bu link adı artıq istifadə olunub." });
    const r = await pool.query(
      `insert into site_products
         (product_key, slug, name, name_az, name_ru, name_en, category_key, image_url, active, sort_order)
       values ($1, $1, $2, $2, $3, $4, $5, $6, $7,
               (select coalesce(max(sort_order), 0) + 10 from site_products))
       returning product_key`,
      [slug, nameAz, txt(b.name_ru), txt(b.name_en), cat, img, b.active !== false]);
    return res.status(200).json({ ok: true, product_key: r.rows[0].product_key });
  }

  return res.status(400).json({ ok: false, error: "Naməlum əməliyyat." });
};

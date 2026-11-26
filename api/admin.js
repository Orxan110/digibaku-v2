const crypto = require("crypto");
const { pool } = require("./_db");
const AUTH = require("./_auth");
const { ensureDiscountTable } = require("../lib/pricing");
const { ensureCustomerTables } = require("../lib/customers");

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
let noteColReady = null;
async function ensureNoteCol() {
  if (!noteColReady) {
    noteColReady = pool.query("alter table orders add column if not exists admin_note text")
      .catch(function (e) { noteColReady = null; throw e; });
  }
  return noteColReady;
}
let delColReady = null;
async function ensureDelCol() {
  if (!delColReady) {
    delColReady = pool.query("alter table site_products add column if not exists deleted_at timestamptz")
      .catch(function (e) { delColReady = null; throw e; });
  }
  return delColReady;
}
let dlvColReady = null;
async function ensureDeliveryCol() {
  if (!dlvColReady) {
    dlvColReady = pool.query("alter table orders add column if not exists delivery_info text")
      .catch(function (e) { dlvColReady = null; throw e; });
  }
  return dlvColReady;
}
let couponsReady = null;
async function ensureCouponsTable() {
  if (!couponsReady) {
    couponsReady = pool.query(`create table if not exists coupons (
        code text primary key,
        kind text not null check (kind in ('percent', 'fixed')),
        value numeric(10,2) not null check (value > 0),
        min_total numeric(10,2) not null default 0,
        max_uses integer,
        used_count integer not null default 0,
        expires_at timestamptz,
        active boolean not null default true,
        created_at timestamptz not null default now())`)
      .catch(function (e) { couponsReady = null; throw e; });
  }
  return couponsReady;
}
const STATUSES = ["pending", "confirmed", "processing", "completed", "cancelled"];
const MONTHS = [1, 2, 3, 6, 12];
const CAT_KEY_RE = /^[a-z0-9_]{2,40}$/;
const FAQ_LANGS = ["az", "ru", "en"];

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

const verify = AUTH.verify;

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

async function inner(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const action = (req.query && req.query.action) || "";

  if (req.method === "POST" && action === "login") {
    const pass = String(process.env.ADMIN_PASSWORD || "").trim();
    const adminEmail = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    if (!pass || !adminEmail || !process.env.ADMIN_SECRET || String(process.env.ADMIN_SECRET).length < 32) {
      return res.status(500).json({ ok: false, error: "ADMIN_EMAIL, ADMIN_PASSWORD və ya ADMIN_SECRET (32+ simvol) Vercel-də təyin olunmayıb." });
    }
    const ip = AUTH.clientIp(req);
    // fail-closed: baza işləməsə də brute-force limiti keçilmir
    const okIp = await AUTH.rateLimit("login:" + ip, 8, 900, true);
    const okAll = await AUTH.rateLimit("login:all", 120, 900, true);
    if (!okIp || !okAll) {
      await AUTH.audit("login_blocked", null, ip);
      return res.status(429).json({ ok: false, error: "Çox sayda cəhd. Bir az sonra yenidən yoxlayın." });
    }
    const b = body(req);
    // Hər iki sahə həmişə yoxlanır (hansının səhv olduğu bilinməsin)
    const okEmail = safeEq(String(b.email || "").trim().toLowerCase(), adminEmail);
    const okPass = safeEq(String(b.password || "").trim(), pass);
    if (!(okEmail && okPass)) {
      await AUTH.audit("login_failed", null, ip);
      await new Promise(function (r) { setTimeout(r, 700); });
      return res.status(401).json({ ok: false, error: "E-poçt və ya şifrə yanlışdır." });
    }
    await AUTH.audit("login_ok", null, ip);
    const token = sign({ role: "admin", iat: Date.now(), exp: Date.now() + 8 * 60 * 60 * 1000 });
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
    await ensureDelCol();
    const cats = await pool.query("select key, name_az from categories order by sort_order, name_az");
    const prods = await pool.query(
      `select p.product_key, p.name_az, p.name_ru, p.name_en, p.category_key, p.image_url, p.active, p.sort_order,
              pp.price_1_month, pp.price_2_month, pp.price_3_month, pp.price_6_month, pp.price_12_month,
              pp.sale_1_price, pp.sale_2_price, pp.sale_3_price, pp.sale_6_price, pp.sale_12_price,
              pp.sale_1_active, pp.sale_2_active, pp.sale_3_active, pp.sale_6_active, pp.sale_12_active
       from site_products p
       left join product_prices pp on pp.product_key = p.product_key
       where p.deleted_at is null
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
      // $1 = product_key, $2... = qiymət dəyərləri (update ilə eyni sıra)
      const ph = cols.map((c, i) => "$" + (i + 2)).join(", ");
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
  // Link birbaşa API-yə gedir (/api/products?img=ID), yönləndirmədən (rewrite) asılı deyil
  if (req.method === "POST" && action === "image_upload") {
    try {
      const b = body(req);
      const m = IMG_RE.exec(String(b.data || ""));
      if (!m) return res.status(400).json({ ok: false, error: "Yalnız JPG, PNG və ya WEBP şəkil yükləyin." });
      const buf = Buffer.from(m[2], "base64");
      if (!buf.length) return res.status(400).json({ ok: false, error: "Şəkil boşdur." });
      if (buf.length > IMG_MAX_BYTES) return res.status(413).json({ ok: false, error: "Şəkil çox böyükdür (maksimum 2 MB)." });
      const okMagic =
        (m[1] === "image/jpeg" && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) ||
        (m[1] === "image/png" && buf.toString("hex", 0, 4) === "89504e47") ||
        (m[1] === "image/webp" && buf.length > 12 && buf.toString("latin1", 0, 4) === "RIFF" && buf.toString("latin1", 8, 12) === "WEBP");
      if (!okMagic) return res.status(400).json({ ok: false, error: "Fayl şəkil formatına uyğun deyil." });
      await ensureImages();
      const id = crypto.randomBytes(16).toString("hex");
      await pool.query("insert into product_images (id, mime, data) values ($1, $2, $3)", [id, m[1], buf]);
      return res.status(200).json({ ok: true, url: "/api/products?img=" + id });
    } catch (e) {
      console.error("image_upload:", e);
      return res.status(500).json({ ok: false, error: "Şəkil bazaya yazılmadı." });
    }
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
    if (img && AUTH.safeUrl(img) === false) {
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
  // ================= ADMIN-EXTRA (başlanğıc) =================
  if (req.method === "GET" && action === "orders2") {
    await ensureNoteCol();
    await ensureDeliveryCol();
    const r = await pool.query(
      `select o.id, o.total, o.status, o.items, o.created_at, o.admin_note, o.delivery_info, u.email, u.name
       from orders o left join neon_auth."user" u on u.id = o.user_id
       order by o.created_at desc limit 500`);
    return res.status(200).json({ ok: true, orders: r.rows });
  }

  if (req.method === "GET" && action === "new_count") {
    const r = await pool.query(
      `select count(*) filter (where status = 'pending')::int as pending,
              count(*)::int as total, max(created_at) as last
       from orders`);
    return res.status(200).json({ ok: true, pending: r.rows[0].pending, total: r.rows[0].total, last: r.rows[0].last });
  }

  if (req.method === "POST" && action === "order_note") {
    const b = body(req);
    await ensureNoteCol();
    const r = await pool.query(
      "update orders set admin_note = $2, updated_at = now() where id = $1 returning id",
      [String(b.id), txt(b.note)]);
    if (!r.rowCount) return res.status(404).json({ ok: false, error: "Sifariş tapılmadı." });
    return res.status(200).json({ ok: true });
  }

  if (req.method === "POST" && action === "product_toggle") {
    const b = body(req);
    const r = await pool.query(
      "update site_products set active = $2 where product_key = $1 returning product_key",
      [String(b.product_key || ""), !!b.active]);
    if (!r.rowCount) return res.status(404).json({ ok: false, error: "Məhsul tapılmadı." });
    return res.status(200).json({ ok: true });
  }

  if (req.method === "GET" && action === "products_trash") {
    await ensureDelCol();
    const r = await pool.query(
      "select product_key, name_az, deleted_at from site_products where deleted_at is not null order by deleted_at desc");
    return res.status(200).json({ ok: true, products: r.rows });
  }

  if (req.method === "POST" && action === "product_delete") {
    await ensureDelCol();
    const key = String(body(req).product_key || "");
    if (!key) return res.status(400).json({ ok: false, error: "Məhsul açarı yoxdur." });
    const r = await pool.query(
      "update site_products set deleted_at = now(), active = false where product_key = $1 and deleted_at is null returning product_key", [key]);
    if (!r.rowCount) return res.status(404).json({ ok: false, error: "Məhsul tapılmadı." });
    return res.status(200).json({ ok: true });
  }

  if (req.method === "POST" && action === "product_restore") {
    await ensureDelCol();
    const key = String(body(req).product_key || "");
    const r = await pool.query(
      "update site_products set deleted_at = null, active = false where product_key = $1 and deleted_at is not null returning product_key", [key]);
    if (!r.rowCount) return res.status(404).json({ ok: false, error: "Məhsul tapılmadı." });
    return res.status(200).json({ ok: true });
  }

  if (req.method === "POST" && action === "product_purge") {
    await ensureDelCol();
    const key = String(body(req).product_key || "");
    if (!key) return res.status(400).json({ ok: false, error: "Məhsul açarı yoxdur." });
    const client = await pool.connect();
    try {
      await client.query("begin");
      const chk = await client.query("select 1 from site_products where product_key = $1 and deleted_at is not null", [key]);
      if (!chk.rowCount) { await client.query("rollback"); return res.status(404).json({ ok: false, error: "Silinmişlər arasında tapılmadı." }); }
      await client.query("delete from product_prices where product_key = $1", [key]);
      const t = await client.query("select to_regclass('public.product_content') as t");
      if (t.rows[0].t) await client.query("delete from product_content where product_key = $1", [key]);
      await client.query("delete from site_products where product_key = $1", [key]);
      await client.query("commit");
    } catch (e) {
      await client.query("rollback").catch(function () {});
      console.error("product_purge:", e);
      return res.status(500).json({ ok: false, error: "Silinmədi." });
    } finally {
      client.release();
    }
    return res.status(200).json({ ok: true });
  }

  if (req.method === "POST" && action === "product_duplicate") {
    const b = body(req);
    const src = String(b.product_key || "");
    const slug = String(b.slug || "").trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(slug)) {
      return res.status(400).json({ ok: false, error: "Link adı yalnız kiçik latın hərfi, rəqəm və - ola bilər (2–80 simvol)." });
    }
    const dup = await pool.query("select 1 from site_products where product_key = $1 or slug = $1", [slug]);
    if (dup.rowCount) return res.status(409).json({ ok: false, error: "Bu link adı artıq istifadə olunub." });
    const client = await pool.connect();
    try {
      await client.query("begin");
      const ins = await client.query(
        `insert into site_products
           (product_key, slug, name, name_az, name_ru, name_en, category_key, image_url, active, sort_order)
         select $2::text, $2::text, name, coalesce(name_az, name) || ' (kopya)', name_ru, name_en,
                category_key, image_url, false,
                (select coalesce(max(sort_order), 0) + 10 from site_products)
         from site_products where product_key = $1`, [src, slug]);
      if (!ins.rowCount) { await client.query("rollback"); return res.status(404).json({ ok: false, error: "Mənbə məhsul tapılmadı." }); }
      const pc = [];
      MONTHS.forEach(function (m) { pc.push("price_" + m + "_month", "sale_" + m + "_price", "sale_" + m + "_active"); });
      await client.query(
        "insert into product_prices (product_key, product_name, " + pc.join(", ") + ") " +
        "select $2::text, (select name_az from site_products where product_key = $2), " + pc.join(", ") +
        " from product_prices where product_key = $1", [src, slug]);
      await client.query("commit");
    } catch (e) {
      await client.query("rollback").catch(function () {});
      console.error("product_duplicate:", e);
      return res.status(500).json({ ok: false, error: "Kopyalanmadı." });
    } finally {
      client.release();
    }
    return res.status(200).json({ ok: true, product_key: slug });
  }

  // Toplu qiymət dəyişmə: percent = +10 (10% bahalaşma) və ya -15 (15% ucuzlaşma); dry=true yalnız sayı qaytarır
  if (req.method === "POST" && action === "price_bulk") {
    const b = body(req);
    const percent = Number(b.percent);
    if (!Number.isFinite(percent) || percent === 0 || percent < -90 || percent > 300) {
      return res.status(400).json({ ok: false, error: "Faiz -90 ilə 300 arasında olmalıdır (0 olmaz)." });
    }
    const cat = txt(b.category_key);
    await ensureDelCol();
    const where = "where product_key in (select product_key from site_products where deleted_at is null and ($2::text is null or category_key = $2::text))";
    const factor = Number((1 + percent / 100).toFixed(4));
    if (b.dry) {
      const c = await pool.query("select count(*)::int as n from product_prices " + where + " and $1::numeric > 0", [factor, cat]);
      return res.status(200).json({ ok: true, count: c.rows[0].n });
    }
    const sets = [];
    MONTHS.forEach(function (m) {
      ["price_" + m + "_month", "sale_" + m + "_price"].forEach(function (col) {
        sets.push(col + " = case when " + col + " is null then null else round(" + col + "::numeric * $1::numeric, 2) end");
      });
    });
    const u = await pool.query(
      "update product_prices set " + sets.join(", ") + ", updated_at = now() " + where, [factor, cat]);
    return res.status(200).json({ ok: true, count: u.rowCount });
  }
  if (req.method === "POST" && action === "order_delivery") {
    const b = body(req);
    await ensureDeliveryCol();
    const r = await pool.query(
      "update orders set delivery_info = $2, updated_at = now() where id = $1 returning id",
      [String(b.id), txt(b.info)]);
    if (!r.rowCount) return res.status(404).json({ ok: false, error: "Sifariş tapılmadı." });
    return res.status(200).json({ ok: true });
  }
  // ================= KUPONLAR =================
  if (req.method === "GET" && action === "coupons") {
    await ensureCouponsTable();
    const r = await pool.query(
      `select code, kind, value, min_total, max_uses, used_count, expires_at, active, created_at
       from coupons order by created_at desc`);
    return res.status(200).json({ ok: true, coupons: r.rows });
  }

  if (req.method === "POST" && action === "coupon_save") {
    await ensureCouponsTable();
    const b = body(req);
    const code = String(b.code || "").trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,40}$/.test(code)) {
      return res.status(400).json({ ok: false, error: "Kod 3–40 simvol olmalıdır: böyük hərf, rəqəm, - və _." });
    }
    const kind = b.kind === "fixed" ? "fixed" : (b.kind === "percent" ? "percent" : null);
    if (!kind) return res.status(400).json({ ok: false, error: "Tip seçin (faiz və ya sabit AZN)." });
    const value = num(b.value);
    if (!(value > 0)) return res.status(400).json({ ok: false, error: "Dəyər 0-dan böyük olmalıdır." });
    if (kind === "percent" && value > 100) return res.status(400).json({ ok: false, error: "Faiz 100-dən çox ola bilməz." });
    const minTotal = (b.min_total === "" || b.min_total == null) ? 0 : num(b.min_total);
    if (!(minTotal >= 0)) return res.status(400).json({ ok: false, error: "Minimum məbləğ düzgün deyil." });
    let maxUses = null;
    if (b.max_uses !== "" && b.max_uses !== null && b.max_uses !== undefined) {
      maxUses = parseInt(b.max_uses, 10);
      if (!(maxUses >= 1)) return res.status(400).json({ ok: false, error: "Limit ən azı 1 olmalıdır (boş qoysanız limit olmayacaq)." });
    }
    let expires = null;
    if (b.expires_at) {
      // Admin Bakı vaxtı ilə daxil edir (+04:00), əgər saat qurşağı yazılmayıbsa
      const raw = String(b.expires_at);
      const d = new Date(/(Z|[+-]\d{2}:?\d{2})$/i.test(raw) ? raw : raw + "+04:00");
      if (isNaN(d.getTime())) return res.status(400).json({ ok: false, error: "Bitmə tarixi düzgün deyil." });
      expires = d.toISOString();
    }
    const active = !(b.active === false || b.active === "false");
    await pool.query(
      `insert into coupons (code, kind, value, min_total, max_uses, expires_at, active)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (code) do update set kind = excluded.kind, value = excluded.value,
         min_total = excluded.min_total, max_uses = excluded.max_uses,
         expires_at = excluded.expires_at, active = excluded.active`,
      [code, kind, value, minTotal, maxUses, expires, active]);
    return res.status(200).json({ ok: true });
  }

  if (req.method === "POST" && action === "coupon_delete") {
    await ensureCouponsTable();
    const code = String(body(req).code || "").trim().toUpperCase();
    const r = await pool.query("select used_count from coupons where code = $1", [code]);
    if (!r.rowCount) return res.status(404).json({ ok: false, error: "Kupon tapılmadı." });
    if (r.rows[0].used_count > 0) {
      return res.status(400).json({ ok: false, error: "İstifadə olunmuş kuponu silmək olmaz. Onu söndürün." });
    }
    await pool.query("delete from coupons where code = $1", [code]);
    return res.status(200).json({ ok: true });
  }

  // ================= MÜŞTƏRİ PROFİLİ =================
  if (req.method === "GET" && action === "customer_detail") {
    await ensureCustomerTables(pool);
    const id = String(req.query.id || "");
    const u = await pool.query('select id, name, email from neon_auth."user" where id = $1', [id]);
    if (!u.rowCount) return res.status(404).json({ ok: false, error: "Müştəri tapılmadı." });
    const p = await pool.query("select note, blocked, balance from customer_profiles where user_id = $1", [id]);
    const o = await pool.query(
      `select id, total, status, items, created_at, coupon_code, discount_amount
       from orders where user_id = $1 order by created_at desc limit 200`, [id]);
    const l = await pool.query(
      "select amount, reason, created_at from customer_ledger where user_id = $1 order by created_at desc limit 50", [id]);
    return res.status(200).json({
      ok: true, user: u.rows[0],
      profile: p.rows[0] || { note: "", blocked: false, balance: 0 },
      orders: o.rows, ledger: l.rows
    });
  }

  if (req.method === "POST" && action === "customer_save") {
    await ensureCustomerTables(pool);
    const b = body(req);
    const id = String(b.id || "");
    if (!id) return res.status(400).json({ ok: false, error: "Müştəri göstərilməyib." });
    const note = String(b.note || "").trim().slice(0, 2000) || null;
    const blocked = b.blocked === true || b.blocked === "true";
    await pool.query(
      `insert into customer_profiles (user_id, note, blocked) values ($1, $2, $3)
       on conflict (user_id) do update set note = excluded.note, blocked = excluded.blocked, updated_at = now()`,
      [id, note, blocked]);
    return res.status(200).json({ ok: true });
  }

  if (req.method === "POST" && action === "customer_balance") {
    await ensureCustomerTables(pool);
    const b = body(req);
    const id = String(b.id || "");
    const amount = num(String(b.amount == null ? "" : b.amount).replace(",", "."));
    // num() mənfi rəqəmi NaN edir, ona görə mənfi məbləğ üçün ayrıca yoxlayırıq
    const raw = Number(String(b.amount == null ? "" : b.amount).replace(",", "."));
    if (!id || !Number.isFinite(raw) || raw === 0 || Math.abs(raw) > 100000) {
      return res.status(400).json({ ok: false, error: "Məbləğ düzgün deyil (0-dan fərqli, maksimum 100000 AZN)." });
    }
    const delta = Math.round(raw * 100) / 100;
    const reason = String(b.reason || "").trim().slice(0, 200) || null;
    const u = await pool.query('select id from neon_auth."user" where id = $1', [id]);
    if (!u.rowCount) return res.status(404).json({ ok: false, error: "Müştəri tapılmadı." });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "insert into customer_profiles (user_id, balance) values ($1, 0) on conflict (user_id) do nothing", [id]);
      const r = await client.query(
        `update customer_profiles set balance = balance + $2, updated_at = now()
         where user_id = $1 and balance + $2 >= 0 returning balance`, [id, delta]);
      if (!r.rowCount) {
        await client.query("ROLLBACK");
        return res.status(400).json({ ok: false, error: "Balans mənfi ola bilməz." });
      }
      await client.query(
        "insert into customer_ledger (user_id, amount, reason) values ($1, $2, $3)", [id, delta, reason]);
      await client.query("COMMIT");
      return res.status(200).json({ ok: true, balance: r.rows[0].balance });
    } catch (e) {
      await client.query("ROLLBACK").catch(function () {});
      throw e;
    } finally {
      client.release();
    }
  }

  // ================= PLANLI ENDİRİM =================
  if (req.method === "GET" && action === "discounts") {
    await ensureDiscountTable(pool);
    const r = await pool.query(
      `select id, name, percent, product_keys, months, starts_at, ends_at, active
       from scheduled_discounts order by starts_at desc limit 200`);
    return res.status(200).json({ ok: true, discounts: r.rows });
  }

  if (req.method === "POST" && action === "discount_save") {
    await ensureDiscountTable(pool);
    const b = body(req);
    const name = txt(b.name);
    if (!name) return res.status(400).json({ ok: false, error: "Endirimə ad verin." });
    const percent = num(b.percent);
    if (!(percent > 0 && percent < 100)) return res.status(400).json({ ok: false, error: "Faiz 0 ilə 100 arasında olmalıdır." });
    const parseDate = function (v) {
      if (!v) return null;
      const raw = String(v);
      // Admin Bakı vaxtı ilə daxil edir (+04:00), saat qurşağı yazılmayıbsa
      const d = new Date(/(Z|[+-]\d{2}:?\d{2})$/i.test(raw) ? raw : raw + "+04:00");
      return isNaN(d.getTime()) ? null : d.toISOString();
    };
    const starts = parseDate(b.starts_at), ends = parseDate(b.ends_at);
    if (!starts || !ends) return res.status(400).json({ ok: false, error: "Başlama və bitmə tarixi düzgün deyil." });
    if (new Date(ends) <= new Date(starts)) return res.status(400).json({ ok: false, error: "Bitmə tarixi başlama tarixindən sonra olmalıdır." });
    // Məhsul açarları: vergüllə ayrılmış siyahı. Boş = bütün məhsullar
    const keys = String(Array.isArray(b.product_keys) ? b.product_keys.join(",") : (b.product_keys || ""))
      .split(",").map(x => x.trim()).filter(Boolean).slice(0, 200);
    // Müddətlər: 1,2,3,6,12-dən. Boş = bütün müddətlər
    const months = (Array.isArray(b.months) ? b.months : []).map(x => parseInt(x, 10)).filter(x => [1, 2, 3, 6, 12].includes(x));
    const active = !(b.active === false || b.active === "false");
    const id = b.id ? parseInt(b.id, 10) : null;
    if (id) {
      const r = await pool.query(
        `update scheduled_discounts set name = $2, percent = $3, product_keys = $4, months = $5,
           starts_at = $6, ends_at = $7, active = $8 where id = $1 returning id`,
        [id, name, percent, keys.length ? keys : null, months.length ? months : null, starts, ends, active]);
      if (!r.rowCount) return res.status(404).json({ ok: false, error: "Endirim tapılmadı." });
      return res.status(200).json({ ok: true, id: r.rows[0].id });
    }
    const r = await pool.query(
      `insert into scheduled_discounts (name, percent, product_keys, months, starts_at, ends_at, active)
       values ($1, $2, $3, $4, $5, $6, $7) returning id`,
      [name, percent, keys.length ? keys : null, months.length ? months : null, starts, ends, active]);
    return res.status(200).json({ ok: true, id: r.rows[0].id });
  }

  if (req.method === "POST" && action === "discount_delete") {
    await ensureDiscountTable(pool);
    const r = await pool.query("delete from scheduled_discounts where id = $1 returning id", [parseInt(body(req).id, 10) || 0]);
    if (!r.rowCount) return res.status(404).json({ ok: false, error: "Endirim tapılmadı." });
    return res.status(200).json({ ok: true });
  }

  // ================= ADMIN-EXTRA (son) =================
  return res.status(400).json({ ok: false, error: "Naməlum əməliyyat." });
}
module.exports = async function handler(req, res) {
  const action = (req.query && req.query.action) || "";
  try {
    if (req.method === "POST" && action !== "login") {
      const b = body(req);
      if (action === "product_save") {
        const img = String(b.image_url || "").trim();
        if (img && AUTH.safeUrl(img) === false) {
          res.setHeader("Cache-Control", "no-store");
          return res.status(400).json({ ok: false, error: "Şəkil linki / və ya https:// ilə başlamalıdır." });
        }
      }
      const adm = verify(String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim());
      if (adm && adm.role === "admin" && action !== "image_upload") {
        const d = [b.id, b.product_key, b.key, b.slug, b.status, b.percent, b.category_key, b.thread]
          .filter(function (x) { return x !== undefined && x !== null && x !== ""; }).join(" | ");
        await AUTH.audit(action, d, AUTH.clientIp(req));
      }
    }
    await inner(req, res);
  } catch (e) {
    console.error("admin:", e);
    if (!res.headersSent) return res.status(500).json({ ok: false, error: "Server xətası." });
  }
};

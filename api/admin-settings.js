const { pool } = require("./_db");
const { requireAdmin, clientIp, audit, ensureSecurity, safeUrl } = require("./_auth");

const FIELDS = ["site_name", "logo_text",
  "city_az", "city_ru", "city_en", "hours_az", "hours_ru", "hours_en",
  "whatsapp", "phone", "email", "instagram", "tiktok",
  "color_gold", "color_sale", "color_chat", "chat_show",
  "color_bg", "color_card", "color_wa",
  "fx_type", "fx_level", "fx_from", "fx_to"];
const PAGE_KEYS = ["about", "rules", "privacy", "terms"];
const SEO_KEYS = ["default", "home", "products", "faq", "contact", "about", "rules", "privacy", "terms"];
const LANGS = ["az", "ru", "en"];

function body(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  return req.body;
}
function clean(v, max) {
  return String(v == null ? "" : v).trim().slice(0, max || 200);
}
async function getVal(key) {
  const r = await pool.query("select value from site_settings where key = $1", [key]);
  return (r.rows[0] && r.rows[0].value) || null;
}
async function putVal(key, value) {
  const cur = await pool.query("select 1 from site_settings where key = $1", [key]);
  if (cur.rowCount) {
    await pool.query("update site_settings set value = $2::jsonb, updated_at = now() where key = $1",
      [key, JSON.stringify(value)]);
  } else {
    await pool.query("insert into site_settings (key, value, updated_at) values ($1, $2::jsonb, now())",
      [key, JSON.stringify(value)]);
  }
}

async function inner(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const action = (req.query && req.query.action) || "";
  const q = req.query || {};

  // ---------- Ümumi parametrlər ----------
  if (req.method === "GET" && action === "get") {
    return res.status(200).json({ ok: true, settings: (await getVal("general")) || {} });
  }

  if (req.method === "POST" && action === "save") {
    const b = body(req);
    const next = {};
    FIELDS.forEach(function (f) { next[f] = clean(b[f]); });

    const wa = next.whatsapp.replace(/[\s\-()]/g, "");
    if (wa && !/^\+?\d{9,15}$/.test(wa)) {
      return res.status(400).json({ ok: false, error: "WhatsApp nömrəsi düzgün deyil (məs: +994501234567)." });
    }
    next.whatsapp = wa;
    if (next.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(next.email)) {
      return res.status(400).json({ ok: false, error: "E-poçt düzgün deyil." });
    }
    if (next.instagram && !/^https:\/\/[^\s"'<>]+$/.test(next.instagram)) {
      return res.status(400).json({ ok: false, error: "Instagram linki https:// ilə başlamalıdır." });
    }
    if (next.tiktok && !/^https:\/\/[^\s"'<>]+$/.test(next.tiktok)) {
      return res.status(400).json({ ok: false, error: "TikTok linki https:// ilə başlamalıdır." });
    }
    ["color_gold", "color_sale", "color_chat", "color_bg", "color_card", "color_wa"].forEach(function (k) {
      if (next[k] && !/^#[0-9a-fA-F]{6}$/.test(next[k])) next[k] = "";
    });
    next.chat_show = next.chat_show === "0" ? "0" : "1";
    // Bayram effekti
    if (["snow", "bonfire", "confetti", "hearts", "fireworks", "petals"].indexOf(next.fx_type) < 0) next.fx_type = "";
    if (["1", "2", "3"].indexOf(next.fx_level) < 0) next.fx_level = "2";
    ["fx_from", "fx_to"].forEach(function (k) {
      if (next[k] && !/^\d{4}-\d{2}-\d{2}$/.test(next[k])) next[k] = "";
    });
    // Çat düyməsinin kiçik şəkli (brauzerdə kiçildilmiş data URL)
    const ico = String(b.chat_icon == null ? "" : b.chat_icon).trim();
    next.chat_icon = (ico.length <= 90000 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+\/=]+$/.test(ico)) ? ico : "";
    // WhatsApp düyməsinin kiçik şəkli
    const wico = String(b.wa_icon == null ? "" : b.wa_icon).trim();
    next.wa_icon = (wico.length <= 90000 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+\/=]+$/.test(wico)) ? wico : "";
    await putVal("general", next);
    return res.status(200).json({ ok: true });
  }

  // ---------- Səhifə mətnləri ----------
  if (req.method === "GET" && action === "page_get") {
    const key = String(q.key || "");
    if (PAGE_KEYS.indexOf(key) < 0) return res.status(400).json({ ok: false, error: "Səhifə yanlışdır." });
    return res.status(200).json({ ok: true, page: (await getVal("page_" + key)) || {} });
  }

  if (req.method === "POST" && action === "page_save") {
    const b = body(req);
    const key = String(b.key || "");
    if (PAGE_KEYS.indexOf(key) < 0) return res.status(400).json({ ok: false, error: "Səhifə yanlışdır." });
    const next = {};
    LANGS.forEach(function (l) {
      next["title_" + l] = clean(b["title_" + l], 150);
      next["body_" + l] = clean(b["body_" + l], 20000);
    });
    await putVal("page_" + key, next);
    return res.status(200).json({ ok: true });
  }

  // ---------- SEO ----------
  if (req.method === "GET" && action === "seo_get") {
    return res.status(200).json({ ok: true, seo: (await getVal("seo")) || {} });
  }

  if (req.method === "POST" && action === "seo_save") {
    const b = body(req);
    const key = String(b.key || "");
    if (SEO_KEYS.indexOf(key) < 0) return res.status(400).json({ ok: false, error: "Səhifə yanlışdır." });
    const next = {};
    LANGS.forEach(function (l) {
      next["title_" + l] = clean(b["title_" + l], 120);
      next["desc_" + l] = clean(b["desc_" + l], 320);
      next["keywords_" + l] = clean(b["keywords_" + l], 300);
    });
    const img = clean(b.og_image, 300);
    if (img && safeUrl(img, 300) === false) {
      return res.status(400).json({ ok: false, error: "Şəkil linki / və ya https:// ilə başlamalıdır." });
    }
    next.og_image = img;
    const all = (await getVal("seo")) || {};
    all[key] = next;
    await putVal("seo", all);
    return res.status(200).json({ ok: true });
  }


  // ---------- Məhsul üzrə SEO ----------
  if (req.method === "GET" && action === "product_seo_get") {
    const r = await pool.query(
      `select coalesce(p.slug, p.product_key) as slug, p.name_az, p.description_az, p.image_url, p.active,
              (greatest(coalesce(pp.price_1_month,0), coalesce(pp.price_2_month,0), coalesce(pp.price_3_month,0),
                        coalesce(pp.price_6_month,0), coalesce(pp.price_12_month,0)) > 0) as has_price
       from site_products p left join product_prices pp on pp.product_key = p.product_key
       where p.deleted_at is null order by p.sort_order, p.name_az`).catch(async function () {
      return pool.query(
        `select coalesce(p.slug, p.product_key) as slug, p.name_az, p.description_az, p.image_url, p.active, true as has_price
         from site_products p order by p.sort_order, p.name_az`);
    });
    return res.status(200).json({ ok: true, products: r.rows, seo: (await getVal("product_seo")) || {} });
  }

  if (req.method === "POST" && action === "product_seo_save") {
    const b = body(req);
    const slug = String(b.slug || "").trim();
    if (!/^[A-Za-z0-9_-]{1,80}$/.test(slug)) return res.status(400).json({ ok: false, error: "Məhsul yanlışdır." });
    const ex = await pool.query("select 1 from site_products where slug = $1 or product_key = $1", [slug]);
    if (!ex.rowCount) return res.status(404).json({ ok: false, error: "Məhsul tapılmadı." });
    const all = (await getVal("product_seo")) || {};
    const next = {
      title_az: clean(b.title_az, 90), desc_az: clean(b.desc_az, 320), keywords_az: clean(b.keywords_az, 300)
    };
    if (!next.title_az && !next.desc_az && !next.keywords_az) delete all[slug]; else all[slug] = next;
    await putVal("product_seo", all);
    return res.status(200).json({ ok: true });
  }

  // ---------- Təhlükəsizlik: jurnal və vəziyyət ----------
  if (req.method === "GET" && action === "audit_list") {
    await ensureSecurity();
    const r = await pool.query("select id, action, detail, ip, created_at from admin_audit order by id desc limit 200");
    return res.status(200).json({ ok: true, rows: r.rows });
  }

  if (req.method === "GET" && action === "security_status") {
    const secret = process.env.ADMIN_SECRET || "";
    const pass = process.env.ADMIN_PASSWORD || "";
    return res.status(200).json({
      ok: true,
      checks: [
        { ok: secret.length >= 32, label: "ADMIN_SECRET uzunluğu 32+ simvol", fix: "Vercel → Environment Variables: ADMIN_SECRET-i 40+ təsadüfi simvolla əvəz edin." },
        { ok: pass.length >= 12, label: "ADMIN_PASSWORD 12+ simvol", fix: "Daha uzun şifrə seçin (hərf+rəqəm+simvol)." },
        { ok: !!process.env.ADMIN_EMAIL, label: "ADMIN_EMAIL Vercel-də təyin olunub", fix: "ADMIN_EMAIL dəyişənini əlavə edin (kodda default e-poçt qalmasın)." },
        { ok: !!process.env.SITE_URL, label: "SITE_URL təyin olunub (sitemap/canonical üçün)", fix: "SITE_URL = https://digibaku.com (öz domeniniz) əlavə edin." },
        { ok: !!process.env.DATABASE_URL, label: "DATABASE_URL təyin olunub", fix: "Neon connection string əlavə edin." }
      ]
    });
  }

  return res.status(400).json({ ok: false, error: "Naməlum əməliyyat." });
}

module.exports = async function handler(req, res) {
  try {
    if (!requireAdmin(req, res)) return;
    if (req.method === "POST") {
      await audit("settings:" + ((req.query && req.query.action) || ""), null, clientIp(req));
    }
    return await inner(req, res);
  } catch (e) {
    console.error("settings:", e);
    if (!res.headersSent) return res.status(500).json({ ok: false, error: "Server xətası." });
  }
};

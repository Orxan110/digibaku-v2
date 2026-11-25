const { pool } = require("./_db");
const { verify } = require("./_auth");

const FIELDS = ["site_name", "logo_text",
  "city_az", "city_ru", "city_en", "hours_az", "hours_ru", "hours_en",
  "whatsapp", "phone", "email", "instagram", "tiktok",
  "color_gold", "color_sale", "color_chat", "chat_show",
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

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const h = req.headers.authorization || "";
  const p = verify(h.replace(/^Bearer\s+/i, "").trim());
  if (!p || p.role !== "admin") return res.status(401).json({ ok: false, error: "Admin girişi tələb olunur." });

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
    if (next.instagram && !/^https?:\/\//.test(next.instagram)) {
      return res.status(400).json({ ok: false, error: "Instagram linki https:// ilə başlamalıdır." });
    }
    if (next.tiktok && !/^https?:\/\//.test(next.tiktok)) {
      return res.status(400).json({ ok: false, error: "TikTok linki https:// ilə başlamalıdır." });
    }
    ["color_gold", "color_sale", "color_chat"].forEach(function (k) {
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
    if (img && !(img.charAt(0) === "/" || /^https:\/\//.test(img))) {
      return res.status(400).json({ ok: false, error: "Şəkil linki / və ya https:// ilə başlamalıdır." });
    }
    next.og_image = img;
    const all = (await getVal("seo")) || {};
    all[key] = next;
    await putVal("seo", all);
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ ok: false, error: "Naməlum əməliyyat." });
};

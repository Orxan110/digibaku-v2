const { pool } = require("./_db");
const seo = require("./_seo");

// /api/settings            -> ümumi parametrlər + SEO
// /api/settings?page=about -> səhifə mətni (about, rules, privacy, terms)
// /api/settings?banners=1  -> ana səhifə bannerləri
const PAGE_KEYS = ["about", "rules", "privacy", "terms"];
const DEFAULTS = {
  site_name: "DigiBaku.com",
  logo_text: "DigiBaku",
  city_az: "Bakı, Azərbaycan", city_ru: "Баку, Азербайджан", city_en: "Baku, Azerbaijan",
  hours_az: "10:00–22:00", hours_ru: "10:00–22:00", hours_en: "10:00–22:00",
  whatsapp: "+994513626349",
  phone: "",
  email: "premium989b@gmail.com",
  instagram: "",
  tiktok: ""
};

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=120");
  const pageKey = req.query && req.query.page;
  const feedKind = req.query && req.query.feed;
  if (feedKind === "sitemap") return seo.sitemap(req, res);
  if (feedKind === "robots") return seo.robots(req, res);
  if (feedKind === "product") return seo.productPage(req, res);

  if (req.query && req.query.banners !== undefined) {
    try {
      const b = await pool.query(
        `select id, title_az, title_ru, title_en, subtitle_az, subtitle_ru, subtitle_en,
                cta_label_az, cta_label_ru, cta_label_en, cta_url, image_url
         from banners where active = true
         order by sort_order, created_at limit 5`);
      return res.status(200).json({ ok: true, banners: b.rows });
    } catch (e) {
      console.error("banners:", e);
      return res.status(500).json({ ok: false, error: "Bannerlər yüklənmədi." });
    }
  }

  if (pageKey !== undefined) {
    if (PAGE_KEYS.indexOf(String(pageKey)) < 0) return res.status(400).json({ ok: false, error: "Səhifə tapılmadı." });
    try {
      const r = await pool.query("select value from site_settings where key = $1", ["page_" + pageKey]);
      return res.status(200).json({ ok: true, page: (r.rows[0] && r.rows[0].value) || {} });
    } catch (e) {
      console.error("settings page:", e);
      return res.status(200).json({ ok: true, page: {} });
    }
  }

  try {
    const r = await pool.query("select key, value from site_settings where key in ('general', 'seo')");
    let saved = {}, seoVal = {};
    r.rows.forEach(function (row) {
      if (row.key === "general") saved = row.value || {};
      if (row.key === "seo") seoVal = row.value || {};
    });
    return res.status(200).json({ ok: true, settings: Object.assign({}, DEFAULTS, saved), seo: seoVal });
  } catch (e) {
    console.error("settings:", e);
    return res.status(200).json({ ok: true, settings: DEFAULTS, seo: {} });
  }
};

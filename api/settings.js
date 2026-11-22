const { pool } = require("./_db");

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

const SITEMAP_PAGES = ["", "products", "faq", "contact", "about", "rules", "privacy", "terms"];

function siteOrigin(req) {
  if (process.env.SITE_URL) return String(process.env.SITE_URL).replace(/\/+$/, "");
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
  return host ? "https://" + host : "";
}

function xmlEsc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

async function feed(req, res, kind) {
  const origin = siteOrigin(req);
  if (kind === "robots") {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).send(
      "User-agent: *\nAllow: /\n\n" + (origin ? "Sitemap: " + origin + "/sitemap.xml\n" : ""));
  }
  const today = new Date().toISOString().slice(0, 10);
  const urls = SITEMAP_PAGES.map(function (p) {
    return { loc: origin + "/" + p, freq: p === "" ? "daily" : "weekly", prio: p === "" ? "1.0" : (p === "products" ? "0.9" : "0.5") };
  });
  try {
    const r = await pool.query(
      "select coalesce(slug, product_key) as slug from site_products where active = true order by sort_order, name_az");
    r.rows.forEach(function (row) {
      if (row.slug) urls.push({ loc: origin + "/product?slug=" + encodeURIComponent(row.slug), freq: "weekly", prio: "0.8" });
    });
  } catch (e) {
    console.error("sitemap:", e);
  }
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map(function (u) {
      return "  <url><loc>" + xmlEsc(u.loc) + "</loc><lastmod>" + today + "</lastmod><changefreq>" + u.freq +
        "</changefreq><priority>" + u.prio + "</priority></url>";
    }).join("\n") + "\n</urlset>\n";
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  return res.status(200).send(xml);
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=120");
  const pageKey = req.query && req.query.page;
  const feedKind = req.query && req.query.feed;
  if (feedKind === "sitemap" || feedKind === "robots") return feed(req, res, feedKind);

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
    let saved = {}, seo = {};
    r.rows.forEach(function (row) {
      if (row.key === "general") saved = row.value || {};
      if (row.key === "seo") seo = row.value || {};
    });
    return res.status(200).json({ ok: true, settings: Object.assign({}, DEFAULTS, saved), seo: seo });
  } catch (e) {
    console.error("settings:", e);
    return res.status(200).json({ ok: true, settings: DEFAULTS, seo: {} });
  }
};

const fs = require("fs");
const path = require("path");
const { pool } = require("./_db");

const MONTHS = [1, 2, 3, 6, 12];
const STATIC_PAGES = [
  { p: "", f: "daily", pr: "1.0" },
  { p: "products", f: "daily", pr: "0.9" },
  { p: "faq", f: "weekly", pr: "0.6" },
  { p: "contact", f: "monthly", pr: "0.5" },
  { p: "about", f: "monthly", pr: "0.5" },
  { p: "rules", f: "monthly", pr: "0.3" },
  { p: "privacy", f: "yearly", pr: "0.2" },
  { p: "terms", f: "yearly", pr: "0.2" }
];
// Yalnız qiyməti olan (saytda görünən) məhsullar
const HAS_PRICE = "greatest(coalesce(pp.price_1_month,0), coalesce(pp.price_2_month,0), coalesce(pp.price_3_month,0), " +
  "coalesce(pp.price_6_month,0), coalesce(pp.price_12_month,0)) > 0";

function origin(req) {
  if (process.env.SITE_URL) return String(process.env.SITE_URL).replace(/\/+$/, "");
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
  return host ? "https://" + host : "";
}
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}
function xmlEsc(s) { return esc(s); }
function ld(obj) {
  return '<script type="application/ld+json">' + JSON.stringify(obj).replace(/</g, "\\u003c") + "</script>";
}
function abs(o, u) {
  if (!u) return "";
  if (/^https:\/\//i.test(u)) return u;
  if (u.charAt(0) === "/" && u.charAt(1) === "/") return "";
  return o + (u.charAt(0) === "/" ? "" : "/") + u;
}
function cut(s, n) {
  s = String(s || "").replace(/\s+/g, " ").trim();
  if (s.length <= n) return s;
  return s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…";
}

// ---------------- robots.txt ----------------
function robots(req, res) {
  const o = origin(req);
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  // DİQQƏT: /api/ bağlanmır — Google məhsulları /api/products-dan JS ilə yükləyir.
  return res.status(200).send(
    "User-agent: *\nAllow: /\nDisallow: /*?q=\n\n" + (o ? "Sitemap: " + o + "/sitemap.xml\n" : ""));
}

// ---------------- sitemap.xml ----------------
async function sitemap(req, res) {
  const o = origin(req);
  const urls = STATIC_PAGES.map(function (s) {
    return "  <url><loc>" + xmlEsc(o + "/" + s.p) + "</loc><changefreq>" + s.f + "</changefreq><priority>" + s.pr + "</priority></url>";
  });
  try {
    const r = await pool.query(
      `select coalesce(p.slug, p.product_key) as slug, p.image_url, p.name_az, pp.updated_at as lastmod
       from site_products p join product_prices pp on pp.product_key = p.product_key
       where p.active = true and ${HAS_PRICE}
       order by p.sort_order, p.name_az`);
    r.rows.forEach(function (row) {
      if (!row.slug) return;
      const loc = o + "/product?slug=" + encodeURIComponent(row.slug);
      const lm = row.lastmod ? "<lastmod>" + new Date(row.lastmod).toISOString().slice(0, 10) + "</lastmod>" : "";
      const img = row.image_url
        ? "<image:image><image:loc>" + xmlEsc(abs(o, row.image_url)) + "</image:loc><image:title>" + xmlEsc(row.name_az || "") + "</image:title></image:image>"
        : "";
      urls.push("  <url><loc>" + xmlEsc(loc) + "</loc>" + lm + "<changefreq>weekly</changefreq><priority>0.8</priority>" + img + "</url>");
    });
  } catch (e) {
    console.error("sitemap:", e);
  }
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n' +
    urls.join("\n") + "\n</urlset>\n";
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  return res.status(200).send(xml);
}

// ---------------- Məhsul səhifəsi (server tərəfdən SEO) ----------------
let tplCache = null;
function template() {
  if (!tplCache) tplCache = fs.readFileSync(path.join(__dirname, "_product.tpl.html"), "utf8");
  return tplCache;
}

async function loadProduct(slug) {
  const r = await pool.query(
    `select p.product_key, coalesce(p.slug, p.product_key) as slug, p.name_az, p.name_en, p.category_key,
            p.description_az, p.image_url,
            pp.price_1_month, pp.price_2_month, pp.price_3_month, pp.price_6_month, pp.price_12_month,
            pp.sale_1_price, pp.sale_2_price, pp.sale_3_price, pp.sale_6_price, pp.sale_12_price,
            pp.sale_1_active, pp.sale_2_active, pp.sale_3_active, pp.sale_6_active, pp.sale_12_active
     from site_products p join product_prices pp on pp.product_key = p.product_key
     where p.active = true and (p.slug = $1 or p.product_key = $1) and ${HAS_PRICE} limit 1`, [slug]);
  const row = r.rows[0];
  if (!row) return null;
  const prices = [];
  MONTHS.forEach(function (m) {
    const base = Number(row["price_" + m + "_month"]);
    const sale = Number(row["sale_" + m + "_price"]);
    const on = row["sale_" + m + "_active"] === true && sale > 0 && base > 0 && sale < base;
    if (on) prices.push({ months: m, price: sale, old: base });
    else if (base > 0) prices.push({ months: m, price: base, old: null });
  });
  if (!prices.length) return null;
  row.prices = prices;

  row.about = ""; row.seo = {}; row.faqs = []; row.rating = { count: 0, avg: 0 };
  try {
    const c = await pool.query("select about_az from product_content where product_key = $1", [row.product_key]);
    row.about = (c.rows[0] && c.rows[0].about_az) || "";
  } catch (e) {}
  try {
    const s = await pool.query("select value from site_settings where key = 'product_seo'");
    const all = (s.rows[0] && s.rows[0].value) || {};
    row.seo = all[row.slug] || all[row.product_key] || {};
  } catch (e) {}
  try {
    const f = await pool.query(
      `select question, answer from site_faqs where active = true and language = 'az' and product_key = $1
       order by sort_order, created_at limit 10`, [row.product_key]);
    row.faqs = f.rows;
  } catch (e) {}
  try {
    const st = await pool.query(
      `select count(*)::int as c, coalesce(round(avg(rating)::numeric, 1), 0)::float as a
       from reviews where product_key = $1 and status = 'approved'`, [row.product_key]);
    row.rating = { count: st.rows[0].c, avg: st.rows[0].a };
  } catch (e) {}
  return row;
}

function renderHtml(headHtml, bodyHtml) {
  return template().replace("<!--SEO_HEAD-->", headHtml).replace("<!--SSR-->", bodyHtml);
}

async function productPage(req, res) {
  const o = origin(req);
  const slug = String((req.query && req.query.slug) || "").trim();
  let p = null;
  if (/^[A-Za-z0-9_-]{1,80}$/.test(slug)) {
    try { p = await loadProduct(slug); } catch (e) { console.error("productPage:", e); }
  }
  res.setHeader("Content-Type", "text/html; charset=utf-8");

  if (!p) {
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return res.status(404).send(renderHtml(
      "<title>Məhsul tapılmadı — DigiBaku</title>" +
      '<meta name="robots" content="noindex, follow">' +
      '<meta name="description" content="Axtardığınız məhsul tapılmadı. DigiBaku-nun bütün məhsullarına baxın.">',
      '<div class="empty">Məhsul tapılmadı. <a href="products.html">Bütün məhsullar</a></div>'));
  }

  const name = p.name_az || p.name_en || p.slug;
  const url = o + "/product?slug=" + encodeURIComponent(p.slug);
  const low = p.prices.reduce(function (a, b) { return b.price < a.price ? b : a; }, p.prices[0]);
  const high = p.prices.reduce(function (a, b) { return b.price > a.price ? b : a; }, p.prices[0]);
  const longDesc = String(p.description_az || "").replace(/\s+/g, " ").trim();

  let title = String(p.seo.title_az || "").trim();
  if (!title) {
    title = name + " — qiymət Azərbaycanda | DigiBaku";
    if (title.length > 65) title = name + " | DigiBaku";
  }
  let desc = String(p.seo.desc_az || "").trim();
  if (!desc) {
    desc = name + " sərfəli qiymətlə: " + low.price.toFixed(2) + " AZN-dən. " + (longDesc ? longDesc + " " : "") +
      "Sürətli çatdırılma və WhatsApp dəstək — DigiBaku.";
  }
  desc = cut(desc, 160);
  let kw = String(p.seo.keywords_az || "").trim();
  if (!kw) kw = [name, name + " al", name + " qiymət", name + " Azərbaycan", name + " Bakı", name + " premium"].join(", ");
  const img = abs(o, p.image_url) || (o + "/assets/og-image.jpg");

  const product = {
    "@context": "https://schema.org", "@type": "Product", name: name, description: desc, url: url,
    brand: { "@type": "Brand", name: "DigiBaku" },
    offers: {
      "@type": "AggregateOffer", priceCurrency: "AZN", lowPrice: low.price.toFixed(2), highPrice: high.price.toFixed(2),
      offerCount: p.prices.length, availability: "https://schema.org/InStock", url: url
    }
  };
  if (img) product.image = [img];
  if (p.rating.count > 0 && p.rating.avg > 0) {
    product.aggregateRating = { "@type": "AggregateRating", ratingValue: p.rating.avg, reviewCount: p.rating.count };
  }
  const crumbs = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "DigiBaku", item: o + "/" },
      { "@type": "ListItem", position: 2, name: "Məhsullar", item: o + "/products" },
      { "@type": "ListItem", position: 3, name: name, item: url }
    ]
  };

  let head = "<title>" + esc(title) + "</title>" +
    '<meta name="description" content="' + esc(desc) + '">' +
    '<meta name="keywords" content="' + esc(kw) + '">' +
    '<meta name="robots" content="index, follow, max-image-preview:large">' +
    '<link rel="canonical" id="ssrSeo" href="' + esc(url) + '">' +
    '<meta property="og:type" content="product">' +
    '<meta property="og:site_name" content="DigiBaku">' +
    '<meta property="og:locale" content="az_AZ">' +
    '<meta property="og:title" content="' + esc(title) + '">' +
    '<meta property="og:description" content="' + esc(desc) + '">' +
    '<meta property="og:url" content="' + esc(url) + '">' +
    (img ? '<meta property="og:image" content="' + esc(img) + '">' : "") +
    '<meta name="twitter:card" content="' + (img ? "summary_large_image" : "summary") + '">' +
    '<meta name="twitter:title" content="' + esc(title) + '">' +
    '<meta name="twitter:description" content="' + esc(desc) + '">' +
    (img ? '<meta name="twitter:image" content="' + esc(img) + '">' : "") +
    ld(product) + ld(crumbs);
  if (p.faqs.length) {
    head += ld({
      "@context": "https://schema.org", "@type": "FAQPage",
      mainEntity: p.faqs.map(function (f) {
        return { "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } };
      })
    });
  }

  // Skriptsiz oxuyan axtarış robotları üçün görünən məzmun (JS yüklənəndə əvəz olunur)
  let body = '<article class="card-box"><h1 style="font-size:24px;margin:0 0 10px">' + esc(name) + "</h1>";
  if (longDesc) body += "<p>" + esc(longDesc) + "</p>";
  body += "<h2 style=\"font-size:18px\">Qiymətlər</h2><ul>" + p.prices.map(function (x) {
    return "<li>" + x.months + " ay — " + x.price.toFixed(2) + " AZN" + (x.old ? " (əvvəl " + x.old.toFixed(2) + " AZN)" : "") + "</li>";
  }).join("") + "</ul>";
  if (p.about) {
    body += "<h2 style=\"font-size:18px\">" + esc(name) + " haqqında</h2>" +
      cut(p.about, 2500).split(/\n{2,}/).map(function (x) { return "<p>" + esc(x) + "</p>"; }).join("");
  }
  if (p.faqs.length) {
    body += "<h2 style=\"font-size:18px\">Tez-tez verilən suallar</h2>" + p.faqs.map(function (f) {
      return "<h3 style=\"font-size:15px\">" + esc(f.question) + "</h3><p>" + esc(f.answer) + "</p>";
    }).join("");
  }
  body += '<p><a href="products.html">Bütün məhsullar</a></p></article>';

  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=86400");
  return res.status(200).send(renderHtml(head, body));
}

module.exports = { robots, sitemap, productPage, origin };

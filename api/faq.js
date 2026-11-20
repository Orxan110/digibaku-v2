const { pool } = require("./_db");

// /api/faq              -> ümumi FAQ (product_key boş olan)
// /api/faq?product=KEY  -> həmin məhsulun FAQ-ları (KEY: product_key və ya slug)
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "public, s-maxage=10, stale-while-revalidate=60");
  const pk = req.query && req.query.product ? String(req.query.product).trim() : "";
  try {
    const r = pk
      ? await pool.query(
          `select id, question, answer, language, sort_order, product_key
           from site_faqs
           where active = true
             and product_key = (select product_key from site_products
                                where product_key = $1 or slug = $1 limit 1)
           order by sort_order, created_at`, [pk])
      : await pool.query(
          `select id, question, answer, language, sort_order, product_key
           from site_faqs where active = true and product_key is null
           order by sort_order, created_at`);
    return res.status(200).json({ ok: true, faqs: r.rows });
  } catch (e) {
    console.error("faq:", e);
    return res.status(500).json({ ok: false, error: "FAQ yüklənmədi." });
  }
};

const { pool } = require("./_db");
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "public, s-maxage=60");
  try {
    const r = await pool.query(
      `select id, question, answer, language, product_key, sort_order
       from site_faqs where active = true order by sort_order, created_at`);
    return res.status(200).json({ ok: true, faqs: r.rows });
  } catch (e) {
    console.error("faq:", e);
    return res.status(500).json({ ok: false, error: "FAQ yüklənmədi." });
  }
};

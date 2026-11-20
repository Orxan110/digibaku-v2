const { pool } = require("./_db");

// Ana səhifə üçün aktiv bannerlər (ictimai, admin tələb etmir)
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "public, s-maxage=10, stale-while-revalidate=60");
  try {
    const r = await pool.query(
      `select id, title_az, title_ru, title_en, subtitle_az, subtitle_ru, subtitle_en,
              cta_label_az, cta_label_ru, cta_label_en, cta_url, image_url
       from banners where active = true
       order by sort_order, created_at limit 5`);
    return res.status(200).json({ ok: true, banners: r.rows });
  } catch (e) {
    console.error("banners:", e);
    return res.status(500).json({ ok: false, error: "Bannerlər yüklənmədi." });
  }
};

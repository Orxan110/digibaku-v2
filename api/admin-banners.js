const { pool } = require("./_db");
const { requireAdmin, audit, clientIp, safeUrl } = require("./_auth");

function body(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  return req.body;
}
function txt(v) {
  const s = String(v == null ? "" : v).trim();
  return s ? s : null;
}

async function inner(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const action = (req.query && req.query.action) || "";

  if (req.method === "GET" && action === "list") {
    const r = await pool.query(
      `select id, title_az, title_ru, title_en, subtitle_az, subtitle_ru, subtitle_en,
              cta_label_az, cta_label_ru, cta_label_en, cta_url, image_url, sort_order, active
       from banners order by sort_order, created_at`);
    return res.status(200).json({ ok: true, banners: r.rows });
  }

  if (req.method === "POST" && action === "save") {
    const b = body(req);
    const titleAz = txt(b.title_az);
    if (!titleAz) return res.status(400).json({ ok: false, error: "Azərbaycanca başlıq daxil edin." });
    const ctaUrl = txt(b.cta_url), imgUrl = txt(b.image_url);
    if ((ctaUrl && safeUrl(ctaUrl) === false && !/^[a-z0-9_-]+\.html(\?[A-Za-z0-9=&%_-]*)?$/i.test(ctaUrl)) ||
        (imgUrl && safeUrl(imgUrl) === false)) {
      return res.status(400).json({ ok: false, error: "Link / və ya https:// ilə başlamalıdır." });
    }
    const vals = [
      titleAz, txt(b.title_ru), txt(b.title_en),
      txt(b.subtitle_az), txt(b.subtitle_ru), txt(b.subtitle_en),
      txt(b.cta_label_az), txt(b.cta_label_ru), txt(b.cta_label_en),
      txt(b.cta_url), txt(b.image_url),
      parseInt(b.sort_order, 10) || 0, !!b.active
    ];
    if (b.id) {
      const r = await pool.query(
        `update banners set title_az=$2, title_ru=$3, title_en=$4, subtitle_az=$5, subtitle_ru=$6, subtitle_en=$7,
           cta_label_az=$8, cta_label_ru=$9, cta_label_en=$10, cta_url=$11, image_url=$12, sort_order=$13, active=$14
         where id = $1 returning id`,
        [String(b.id)].concat(vals));
      if (!r.rowCount) return res.status(404).json({ ok: false, error: "Banner tapılmadı." });
      return res.status(200).json({ ok: true, id: r.rows[0].id });
    }
    const r = await pool.query(
      `insert into banners (title_az, title_ru, title_en, subtitle_az, subtitle_ru, subtitle_en,
         cta_label_az, cta_label_ru, cta_label_en, cta_url, image_url, sort_order, active)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) returning id`, vals);
    return res.status(200).json({ ok: true, id: r.rows[0].id });
  }

  if (req.method === "POST" && action === "delete") {
    const b = body(req);
    const r = await pool.query("delete from banners where id = $1 returning id", [String(b.id || "")]);
    if (!r.rowCount) return res.status(404).json({ ok: false, error: "Banner tapılmadı." });
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ ok: false, error: "Naməlum əməliyyat." });
}

module.exports = async function handler(req, res) {
  try {
    if (!requireAdmin(req, res)) return;
    if (req.method === "POST") {
      await audit("banners:" + ((req.query && req.query.action) || ""), null, clientIp(req));
    }
    return await inner(req, res);
  } catch (e) {
    console.error("banners:", e);
    if (!res.headersSent) return res.status(500).json({ ok: false, error: "Server xətası." });
  }
};

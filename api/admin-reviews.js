// v1
const { pool, ensureSchema } = require("./_db");
const { verify } = require("./_auth");

const STATUSES = ["pending", "approved", "rejected"];

function body(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  return req.body;
}
function txt(v) {
  const s = String(v == null ? "" : v).trim();
  return s ? s : null;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const h = req.headers.authorization || "";
  const p = verify(h.replace(/^Bearer\s+/i, "").trim());
  if (!p || p.role !== "admin") return res.status(401).json({ ok: false, error: "Admin girişi tələb olunur." });

  const action = (req.query && req.query.action) || "";
  await ensureSchema();

  if (req.method === "GET" && action === "list") {
    const r = await pool.query(
      `select r.id, r.author_name, r.rating, r.body_az, r.body_ru, r.body_en, r.review_date, r.status,
              r.show_on_home, r.sort_order, r.source, r.created_at, r.product_key,
              p.name_az as product_name
       from reviews r left join site_products p on p.product_key = r.product_key
       order by r.created_at desc limit 300`);
    return res.status(200).json({ ok: true, reviews: r.rows });
  }

  if (req.method === "POST" && action === "add") {
    const b = body(req);
    const name = txt(b.author_name);
    const bodyAz = txt(b.body_az);
    const rating = Math.min(5, Math.max(1, parseInt(b.rating, 10) || 5));
    if (!name || !bodyAz) return res.status(400).json({ ok: false, error: "Ad və Azərbaycanca mətn daxil edin." });
    const status = STATUSES.includes(b.status) ? b.status : "approved";
    const pk = txt(b.product_key);
    if (pk) {
      const ex = await pool.query("select 1 from site_products where product_key = $1", [pk]);
      if (!ex.rowCount) return res.status(400).json({ ok: false, error: "Məhsul tapılmadı." });
    }
    const r = await pool.query(
      `insert into reviews (author_name, rating, body_az, body_ru, body_en, review_date, status, show_on_home, source, product_key)
       values ($1, $2, $3, $4, $5, coalesce($6::date, current_date), $7, $8, 'admin', $9)
       returning id`,
      [name, rating, bodyAz, txt(b.body_ru), txt(b.body_en), txt(b.review_date), status, !!b.show_on_home, pk]);
    return res.status(200).json({ ok: true, id: r.rows[0].id });
  }

  if (req.method === "POST" && action === "status") {
    const b = body(req);
    if (!STATUSES.includes(b.status)) return res.status(400).json({ ok: false, error: "Status yanlışdır." });
    const r = await pool.query(
      "update reviews set status = $2, show_on_home = case when $2 = 'approved' then show_on_home else false end where id = $1 returning id",
      [String(b.id), b.status]);
    if (!r.rowCount) return res.status(404).json({ ok: false, error: "Rəy tapılmadı." });
    return res.status(200).json({ ok: true });
  }

  if (req.method === "POST" && action === "home") {
    const b = body(req);
    const r = await pool.query(
      "update reviews set show_on_home = $2 where id = $1 and status = 'approved' returning id",
      [String(b.id), !!b.show_on_home]);
    if (!r.rowCount) return res.status(400).json({ ok: false, error: "Yalnız təsdiqlənmiş rəy ana səhifədə göstərilə bilər." });
    return res.status(200).json({ ok: true });
  }

  if (req.method === "POST" && action === "delete") {
    const b = body(req);
    const r = await pool.query("delete from reviews where id = $1 returning id", [String(b.id || "")]);
    if (!r.rowCount) return res.status(404).json({ ok: false, error: "Rəy tapılmadı." });
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ ok: false, error: "Naməlum əməliyyat." });
};

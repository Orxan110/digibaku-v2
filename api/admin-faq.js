const { pool } = require("./_db");
const { verify } = require("./_auth");

const FAQ_LANGS = ["az", "ru", "en"];

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

  if (req.method === "GET" && action === "list") {
    const r = await pool.query(
      `select f.id, f.question, f.answer, f.language, f.sort_order, f.active, f.product_key,
              f.show_global, p.name_az as product_name
       from site_faqs f
       left join site_products p on p.product_key = f.product_key
       order by f.language, f.sort_order, f.created_at`);
    return res.status(200).json({ ok: true, faqs: r.rows });
  }

  if (req.method === "GET" && action === "products") {
    const r = await pool.query(
      "select product_key, name_az from site_products order by sort_order, name_az");
    return res.status(200).json({ ok: true, products: r.rows });
  }

  if (req.method === "POST" && action === "save") {
    const b = body(req);
    const lang = String(b.language || "az");
    const q = txt(b.question);
    const a = txt(b.answer);
    const pk = txt(b.product_key);
    const showGlobal = !!b.show_global;
    if (!FAQ_LANGS.includes(lang)) return res.status(400).json({ ok: false, error: "Dil yanlışdır." });
    if (!q || !a) return res.status(400).json({ ok: false, error: "Sual və cavab daxil edin." });
    if (pk) {
      const ex = await pool.query("select 1 from site_products where product_key = $1", [pk]);
      if (!ex.rowCount) return res.status(400).json({ ok: false, error: "Məhsul tapılmadı." });
    }
    // Məhsul seçilməyibsə, sual həmişə ümumi FAQ-da olur
    const sg = pk ? showGlobal : true;
    const sort = parseInt(b.sort_order, 10) || 0;
    if (b.id) {
      const r = await pool.query(
        `update site_faqs set question = $2, answer = $3, language = $4, sort_order = $5,
           active = $6, product_key = $7, show_global = $8
         where id = $1 returning id`,
        [String(b.id), q, a, lang, sort, !!b.active, pk, sg]);
      if (!r.rowCount) return res.status(404).json({ ok: false, error: "Sual tapılmadı." });
      return res.status(200).json({ ok: true, id: r.rows[0].id });
    }
    const r = await pool.query(
      `insert into site_faqs (question, answer, language, sort_order, active, product_key, show_global)
       values ($1, $2, $3, $4, $5, $6, $7) returning id`,
      [q, a, lang, sort, !!b.active, pk, sg]);
    return res.status(200).json({ ok: true, id: r.rows[0].id });
  }

  if (req.method === "POST" && action === "delete") {
    const b = body(req);
    const r = await pool.query("delete from site_faqs where id = $1 returning id", [String(b.id || "")]);
    if (!r.rowCount) return res.status(404).json({ ok: false, error: "Sual tapılmadı." });
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ ok: false, error: "Naməlum əməliyyat." });
};

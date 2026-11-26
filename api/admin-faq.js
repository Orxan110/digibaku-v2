const { pool, ensureSchema } = require("./_db");
const { requireAdmin, audit, clientIp, safeUrl } = require("./_auth");

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

async function inner(req, res) {
  res.setHeader("Cache-Control", "no-store");

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

  if (req.method === "GET" && action === "content_get") {
    await ensureSchema();
    const pk = String((req.query && req.query.product_key) || "");
    const r = await pool.query("select * from product_content where product_key = $1", [pk]);
    return res.status(200).json({ ok: true, content: r.rows[0] || {} });
  }

  if (req.method === "POST" && action === "content_save") {
    await ensureSchema();
    const b = body(req);
    const pk = txt(b.product_key);
    if (!pk) return res.status(400).json({ ok: false, error: "Məhsul seçin." });
    const ex = await pool.query("select 1 from site_products where product_key = $1", [pk]);
    if (!ex.rowCount) return res.status(400).json({ ok: false, error: "Məhsul tapılmadı." });
    const cols = [];
    ["about", "usage", "howto"].forEach(function (k) { FAQ_LANGS.forEach(function (l) { cols.push(k + "_" + l); }); });
    const vals = cols.map(function (c) { return txt(b[c]); });
    const sets = cols.map(function (c, i) { return c + " = $" + (i + 2); }).join(", ");
    await pool.query(
      "insert into product_content (product_key, " + cols.join(", ") + ") values ($1, " +
      cols.map(function (c, i) { return "$" + (i + 2); }).join(", ") + ") " +
      "on conflict (product_key) do update set " + sets + ", updated_at = now()",
      [pk].concat(vals));
    return res.status(200).json({ ok: true });
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
}

module.exports = async function handler(req, res) {
  try {
    if (!requireAdmin(req, res)) return;
    if (req.method === "POST") {
      await audit("faq:" + ((req.query && req.query.action) || ""), null, clientIp(req));
    }
    return await inner(req, res);
  } catch (e) {
    console.error("faq:", e);
    if (!res.headersSent) return res.status(500).json({ ok: false, error: "Server xətası." });
  }
};

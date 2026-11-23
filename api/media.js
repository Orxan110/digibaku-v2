const { pool } = require("./_db");

// /img/<id> -> admin tərəfindən yüklənmiş məhsul şəkli (Neon bazasından)
module.exports = async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const id = String((req.query && req.query.id) || "");
  if (!/^[a-f0-9]{32}$/.test(id)) return res.status(404).end();
  try {
    const r = await pool.query("select mime, data from product_images where id = $1", [id]);
    if (!r.rowCount) return res.status(404).end();
    res.setHeader("Content-Type", r.rows[0].mime);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.status(200).send(r.rows[0].data);
  } catch (e) {
    console.error("media:", e);
    return res.status(500).end();
  }
};

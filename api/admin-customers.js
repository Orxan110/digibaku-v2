// v5
const { pool } = require("./_db");
const { verify } = require("./_auth");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const h = req.headers.authorization || "";
  const p = verify(h.replace(/^Bearer\s+/i, "").trim());
  if (!p || p.role !== "admin") return res.status(401).json({ ok: false, error: "Admin girişi tələb olunur." });

  const action = (req.query && req.query.action) || "";

  if (req.method === "GET" && action === "list") {
    const r = await pool.query(
      `select u.id, u.email,
              count(o.id)::int as order_count,
              coalesce(sum(o.total), 0) as total_spent,
              max(o.created_at) as last_order
       from neon_auth."user" u
       left join orders o on o.user_id = u.id
       group by u.id, u.email
       order by last_order desc nulls last, u.email
       limit 500`);
    return res.status(200).json({ ok: true, customers: r.rows });
  }

  return res.status(400).json({ ok: false, error: "Naməlum əməliyyat." });
};

const { pool, getUserId } = require("./_db");

const STATUSES = ["pending", "confirmed", "processing", "completed", "cancelled"];

async function isAdmin(userId) {
  const r = await pool.query(
    "select 1 from admin_users where user_id = $1 and active = true limit 1", [userId]);
  return r.rowCount > 0;
}

function body(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch { return {}; } }
  return req.body;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ ok: false, error: "Əvvəl daxil olun." });
  if (!(await isAdmin(userId))) return res.status(403).json({ ok: false, error: "Admin icazəsi yoxdur." });

  const action = (req.query && req.query.action) || "";

  if (req.method === "GET" && action === "me") {
    return res.status(200).json({ ok: true, isAdmin: true });
  }

  if (req.method === "GET" && action === "orders") {
    const r = await pool.query(
      `select o.id, o.total, o.status, o.items, o.created_at, u.email
       from orders o left join neon_auth."user" u on u.id = o.user_id
       order by o.created_at desc limit 200`);
    return res.status(200).json({ ok: true, orders: r.rows });
  }

  if (req.method === "POST" && action === "order_status") {
    const b = body(req);
    if (!STATUSES.includes(b.status)) return res.status(400).json({ ok: false, error: "Status yanlışdır." });
    const r = await pool.query(
      "update orders set status = $1, updated_at = now() where id = $2 returning id, status",
      [b.status, String(b.id)]);
    if (!r.rowCount) return res.status(404).json({ ok: false, error: "Sifariş tapılmadı." });
    return res.status(200).json({ ok: true, order: r.rows[0] });
  }

  return res.status(400).json({ ok: false, error: "Naməlum əməliyyat." });
};

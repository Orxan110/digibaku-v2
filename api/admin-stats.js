// v5
const { pool } = require("./_db");
const { verify } = require("./_auth");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const h = req.headers.authorization || "";
  const p = verify(h.replace(/^Bearer\s+/i, "").trim());
  if (!p || p.role !== "admin") return res.status(401).json({ ok: false, error: "Admin girişi tələb olunur." });

  const action = (req.query && req.query.action) || "";
  if (req.method !== "GET" || action !== "summary") {
    return res.status(400).json({ ok: false, error: "Naməlum əməliyyat." });
  }

  const byStatus = await pool.query("select status, count(*)::int as n from orders group by status");
  const totals = await pool.query(
    `select count(*)::int as orders,
            coalesce(sum(total) filter (where status <> 'cancelled'), 0) as revenue
     from orders`);
  const customers = await pool.query('select count(*)::int as n from neon_auth."user"');
  const days = await pool.query(
    `select to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as day,
            count(*)::int as orders,
            coalesce(sum(total) filter (where status <> 'cancelled'), 0) as revenue
     from orders
     where created_at > now() - interval '7 days'
     group by 1 order by 1`);
  const top = await pool.query(
    `select item->>'name' as name,
            sum((item->>'qty')::int)::int as qty,
            sum((item->>'qty')::numeric * (item->>'unit_price')::numeric) as revenue
     from orders o, jsonb_array_elements(o.items) item
     where o.status <> 'cancelled'
     group by 1 order by qty desc limit 10`);
  const reviews = await pool.query("select count(*)::int as n from reviews where status = 'pending'");

  return res.status(200).json({
    ok: true,
    orders: totals.rows[0].orders,
    revenue: totals.rows[0].revenue,
    customers: customers.rows[0].n,
    pendingReviews: reviews.rows[0].n,
    byStatus: byStatus.rows,
    days: days.rows,
    top: top.rows
  });
};

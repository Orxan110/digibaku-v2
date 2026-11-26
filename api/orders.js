const { pool, getUserId } = require("./_db");
const { rateLimit } = require("./_auth");

const MONTHS = [1, 2, 3, 6, 12];

let dlvReady = null;
function ensureDlv() {
  if (!dlvReady) dlvReady = pool.query("alter table orders add column if not exists delivery_info text")
    .catch(function (e) { dlvReady = null; throw e; });
  return dlvReady;
}

function body(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch { return {}; } }
  return req.body;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    const userId = await getUserId(req);
    if (!userId) return res.status(401).json({ ok: false, error: "Sifariş üçün daxil olun." });

    if (req.method === "GET") {
      await ensureDlv();
      const r = await pool.query(
        `select id, total, status, items, created_at,
                case when status = 'completed' then delivery_info end as delivery_info
         from orders
         where user_id = $1 order by created_at desc limit 100`, [userId]);
      return res.status(200).json({ ok: true, orders: r.rows });
    }

    if (req.method === "POST") {
      // Spam sifarişlərə qarşı: istifadəçi başına saatda 10 sifariş
      if (!(await rateLimit("order:" + userId, 10, 3600))) {
        return res.status(429).json({ ok: false, error: "Çox sayda sifariş göndərdiniz. Bir az sonra yenidən cəhd edin." });
      }
      const input = body(req).items;
      if (!Array.isArray(input) || input.length === 0 || input.length > 20) {
        return res.status(400).json({ ok: false, error: "Səbət boşdur." });
      }
      const keys = [...new Set(input.map(i => String((i && i.product_key) || "").slice(0, 100)))];
      const rows = await pool.query(
        `select p.product_key, p.name_az, pp.*
         from site_products p join product_prices pp on pp.product_key = p.product_key
         where p.active = true and p.product_key = any($1)`, [keys]);
      const map = new Map(rows.rows.map(r => [r.product_key, r]));

      const items = [];
      let total = 0;
      for (const i of input) {
        const months = Number(i && i.months);
        const qty = Math.min(10, Math.max(1, parseInt(i && i.qty, 10) || 1));
        const r = map.get(String((i && i.product_key) || ""));
        if (!r || !MONTHS.includes(months)) {
          return res.status(400).json({ ok: false, error: "Səbətdə etibarsız məhsul var." });
        }
        const sale = Number(r[`sale_${months}_price`]);
        const base = Number(r[`price_${months}_month`]);
        const unit = r[`sale_${months}_active`] === true && sale > 0 ? sale : base;
        if (!(unit > 0)) return res.status(400).json({ ok: false, error: "Bu müddət üçün qiymət yoxdur." });
        items.push({ product_key: r.product_key, name: r.name_az, months, qty, unit_price: Number(unit.toFixed(2)) });
        total += unit * qty;
      }

      const ins = await pool.query(
        `insert into orders (user_id, total, status, items)
         values ($1, $2, 'pending', $3::jsonb)
         returning id, total, status, items, created_at`,
        [userId, Number(total.toFixed(2)), JSON.stringify(items)]);
      return res.status(201).json({ ok: true, order: ins.rows[0] });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (e) {
    console.error("orders:", e);
    return res.status(500).json({ ok: false, error: "Server xətası. Bir az sonra yenidən cəhd edin." });
  }
};

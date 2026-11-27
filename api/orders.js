const { pool, getUserId } = require("./_db");
const { rateLimit, sameOrigin } = require("./_auth");
const { activeDiscounts, unitPrice } = require("../lib/pricing");
const { ensureCustomerTables } = require("../lib/customers");

const MONTHS = [1, 2, 3, 6, 12];
const BAD_COUPON = "Kupon etibarsızdır və ya müddəti bitib.";

let schemaReady = null;
function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async function () {
      await pool.query("alter table orders add column if not exists delivery_info text");
      await ensureCustomerTables(pool);
      await pool.query("alter table orders add column if not exists coupon_code text");
      await pool.query("alter table orders add column if not exists discount_amount numeric(10,2) not null default 0");
      await pool.query("alter table orders add column if not exists balance_used numeric(10,2) not null default 0");
      // kind: 'percent' (faiz) və ya 'fixed' (sabit AZN). Kodlar həmişə BÖYÜK HƏRFLƏ saxlanılır.
      await pool.query(`create table if not exists coupons (
        code text primary key,
        kind text not null check (kind in ('percent', 'fixed')),
        value numeric(10,2) not null check (value > 0),
        min_total numeric(10,2) not null default 0,
        max_uses integer,
        used_count integer not null default 0,
        expires_at timestamptz,
        active boolean not null default true,
        created_at timestamptz not null default now()
      )`);
      // Hər istifadəçi eyni kuponu yalnız bir dəfə işlədə bilər
      await pool.query(`create table if not exists coupon_uses (
        code text not null,
        user_id text not null,
        order_id text,
        created_at timestamptz not null default now(),
        primary key (code, user_id)
      )`);
    })().catch(function (e) { schemaReady = null; throw e; });
  }
  return schemaReady;
}

function body(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch { return {}; } }
  return req.body;
}

function httpErr(status, msg) {
  const e = new Error(msg);
  e.status = status;
  return e;
}

function round2(n) { return Math.round(n * 100) / 100; }

function normalizeCode(v) {
  return String(v || "").trim().toUpperCase().slice(0, 40);
}

// Səbəti serverdə qiymətləndirir (client qiymətinə etibar edilmir)
async function priceCart(input) {
  if (!Array.isArray(input) || input.length === 0 || input.length > 20) {
    throw httpErr(400, "Səbət boşdur.");
  }
  const keys = [...new Set(input.map(i => String((i && i.product_key) || "").slice(0, 100)))];
  const rows = await pool.query(
    `select p.product_key, p.slug, p.name_az, pp.*
     from site_products p join product_prices pp on pp.product_key = p.product_key
     where p.active = true and p.product_key = any($1)`, [keys]);
  const map = new Map(rows.rows.map(r => [r.product_key, r]));
  const discounts = await activeDiscounts(pool);

  const items = [];
  let subtotal = 0;
  for (const i of input) {
    const months = Number(i && i.months);
    const qty = Math.min(10, Math.max(1, parseInt(i && i.qty, 10) || 1));
    const r = map.get(String((i && i.product_key) || ""));
    if (!r || !MONTHS.includes(months)) throw httpErr(400, "Səbətdə etibarsız məhsul var.");
    const u = unitPrice(r, months, discounts);
    if (!u || !(u.price > 0)) throw httpErr(400, "Bu müddət üçün qiymət yoxdur.");
    const unit = u.price;
    items.push({ product_key: r.product_key, name: r.name_az, months, qty, unit_price: Number(unit.toFixed(2)) });
    subtotal += unit * qty;
  }
  return { items, subtotal: round2(subtotal) };
}

function discountFor(c, subtotal) {
  let d = c.kind === "percent" ? subtotal * Number(c.value) / 100 : Number(c.value);
  if (d > subtotal) d = subtotal;
  return round2(Math.max(0, d));
}

// Kuponu yoxlayır. db = pool və ya transaksiya client-i. lock=true → sətir kilidlənir.
async function checkCoupon(db, code, userId, subtotal, lock) {
  const r = await db.query(
    `select code, kind, value, min_total from coupons
     where code = $1 and active = true
       and (expires_at is null or expires_at > now())
       and (max_uses is null or used_count < max_uses)
     ${lock ? "for update" : ""}`, [code]);
  const c = r.rows[0];
  if (!c) throw httpErr(400, BAD_COUPON);
  if (subtotal < Number(c.min_total)) {
    throw httpErr(400, "Bu kupon üçün səbət məbləği çatmır (minimum " + Number(c.min_total).toFixed(2) + " AZN).");
  }
  const used = await db.query("select 1 from coupon_uses where code = $1 and user_id = $2", [code, userId]);
  if (used.rowCount) throw httpErr(400, "Bu kupondan artıq istifadə etmisiniz.");
  return { code: c.code, amount: discountFor(c, subtotal) };
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    const userId = await getUserId(req);
    if (!userId) return res.status(401).json({ ok: false, error: "Sifariş üçün daxil olun." });
    await ensureSchema();

    if (req.method === "GET") {
      const r = await pool.query(
        `select id, total, status, items, created_at, discount_amount, coupon_code, balance_used,
                case when status = 'completed' then delivery_info end as delivery_info
         from orders
         where user_id = $1 order by created_at desc limit 100`, [userId]);
      return res.status(200).json({ ok: true, orders: r.rows });
    }

    if (req.method === "POST") {
      if (!sameOrigin(req)) return res.status(403).json({ ok: false, error: "Forbidden" });
      const prof = await pool.query("select blocked from customer_profiles where user_id = $1", [userId]);
      if (prof.rows[0] && prof.rows[0].blocked) {
        return res.status(403).json({ ok: false, error: "Hesabınız bloklanıb. Dəstək ilə əlaqə saxlayın." });
      }
      const b = body(req);
      const code = normalizeCode(b.coupon);

      // Kupon cəhdləri (kod tapmaq üçün brute-force-un qarşısı): istifadəçi başına 10 dəqiqədə 30
      if (code && !(await rateLimit("coupon:" + userId, 30, 600))) {
        return res.status(429).json({ ok: false, error: "Çox cəhd edildi. Bir az sonra yenidən yoxlayın." });
      }

      // Önizləmə: səbətdə kuponun endirimini yoxlayır, sifariş yaratmır
      if (b.preview === true) {
        const priced = await priceCart(b.items);
        let disc = 0, applied = null;
        if (code) {
          const c = await checkCoupon(pool, code, userId, priced.subtotal, false);
          disc = c.amount; applied = c.code;
        }
        const afterCoupon = round2(priced.subtotal - disc);
        const bal = await pool.query("select balance from customer_profiles where user_id = $1", [userId]);
        const balance = bal.rows[0] ? Number(bal.rows[0].balance) : 0;
        const balUsed = round2(Math.min(Math.max(balance, 0), afterCoupon));
        return res.status(200).json({
          ok: true, subtotal: priced.subtotal, coupon: applied,
          discount: disc, balance_used: balUsed, total: round2(afterCoupon - balUsed)
        });
      }

      // Spam sifarişlərə qarşı: istifadəçi başına saatda 10 sifariş
      if (!(await rateLimit("order:" + userId, 10, 3600))) {
        return res.status(429).json({ ok: false, error: "Çox sayda sifariş göndərdiniz. Bir az sonra yenidən cəhd edin." });
      }

      const priced = await priceCart(b.items);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        let disc = 0, usedCode = null;
        if (code) {
          const c = await checkCoupon(client, code, userId, priced.subtotal, true);
          disc = c.amount; usedCode = c.code;
        }
        // Balans: kupon endirimindən sonra qalan məbləğdən çıxılır (müştərinin balansı varsa)
        const afterCoupon = round2(priced.subtotal - disc);
        const bal = await client.query("select balance from customer_profiles where user_id = $1 for update", [userId]);
        const balance = bal.rows[0] ? Number(bal.rows[0].balance) : 0;
        const balUsed = round2(Math.min(Math.max(balance, 0), afterCoupon));
        const total = round2(afterCoupon - balUsed);
        const ins = await client.query(
          `insert into orders (user_id, total, status, items, coupon_code, discount_amount, balance_used, cashback_done, balance_reverted)
           values ($1, $2, 'pending', $3::jsonb, $4, $5, $6, false, false)
           returning id, total, status, items, created_at, coupon_code, discount_amount, balance_used`,
          [userId, total, JSON.stringify(priced.items), usedCode, disc, balUsed]);
        if (balUsed > 0) {
          await client.query(
            "update customer_profiles set balance = balance - $2, updated_at = now() where user_id = $1", [userId, balUsed]);
          await client.query(
            "insert into customer_ledger (user_id, amount, reason) values ($1, $2, $3)",
            [userId, -balUsed, "Sifariş #" + String(ins.rows[0].id).slice(0, 8)]);
        }
        if (usedCode) {
          await client.query(
            "insert into coupon_uses (code, user_id, order_id) values ($1, $2, $3)",
            [usedCode, userId, String(ins.rows[0].id)]);
          await client.query("update coupons set used_count = used_count + 1 where code = $1", [usedCode]);
        }
        await client.query("COMMIT");
        return res.status(201).json({ ok: true, order: ins.rows[0] });
      } catch (e) {
        await client.query("ROLLBACK").catch(function () {});
        throw e;
      } finally {
        client.release();
      }
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (e) {
    if (e && e.status) return res.status(e.status).json({ ok: false, error: e.message });
    console.error("orders:", e);
    return res.status(500).json({ ok: false, error: "Server xətası. Bir az sonra yenidən cəhd edin." });
  }
};

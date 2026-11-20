const crypto = require("crypto");
const { pool } = require("./_db");

const STATUSES = ["pending", "confirmed", "processing", "completed", "cancelled"];

function body(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  return req.body;
}

function sign(payload) {
  const secret = process.env.ADMIN_SECRET || "";
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return data + "." + sig;
}

function verify(token) {
  const secret = process.env.ADMIN_SECRET || "";
  if (!secret || !token || token.indexOf(".") < 0) return null;
  const parts = token.split(".");
  const data = parts[0], sig = parts[1];
  const expect = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  const a = Buffer.from(sig), b = Buffer.from(expect);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let p;
  try { p = JSON.parse(Buffer.from(data, "base64url").toString()); } catch (e) { return null; }
  if (!p.exp || Date.now() > p.exp) return null;
  return p;
}

function safeEq(x, y) {
  const a = Buffer.from(String(x)), b = Buffer.from(String(y));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const action = (req.query && req.query.action) || "";

  // Admin girişi: şifrə Vercel environment-dən (ADMIN_PASSWORD) yoxlanır
  if (req.method === "POST" && action === "login") {
    const pass = process.env.ADMIN_PASSWORD || "";
    if (!pass || !process.env.ADMIN_SECRET) {
      return res.status(500).json({ ok: false, error: "ADMIN_PASSWORD və ya ADMIN_SECRET Vercel-də təyin olunmayıb." });
    }
    const b = body(req);
    if (!safeEq(b.password || "", pass)) return res.status(401).json({ ok: false, error: "Şifrə yanlışdır." });
    const token = sign({ role: "admin", exp: Date.now() + 12 * 60 * 60 * 1000 });
    return res.status(200).json({ ok: true, token: token });
  }

  const h = req.headers.authorization || "";
  const p = verify(h.replace(/^Bearer\s+/i, "").trim());
  if (!p || p.role !== "admin") return res.status(401).json({ ok: false, error: "Admin girişi tələb olunur." });

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

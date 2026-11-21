const { pool } = require("./_db");
const { verify } = require("./_auth");

const FIELDS = ["site_name", "logo_text",
  "city_az", "city_ru", "city_en", "hours_az", "hours_ru", "hours_en",
  "whatsapp", "phone", "email", "instagram", "tiktok"];

function body(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  return req.body;
}
function clean(v) {
  return String(v == null ? "" : v).trim().slice(0, 200);
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const h = req.headers.authorization || "";
  const p = verify(h.replace(/^Bearer\s+/i, "").trim());
  if (!p || p.role !== "admin") return res.status(401).json({ ok: false, error: "Admin girişi tələb olunur." });

  const action = (req.query && req.query.action) || "";

  if (req.method === "GET" && action === "get") {
    const r = await pool.query("select value from site_settings where key = 'general'");
    return res.status(200).json({ ok: true, settings: (r.rows[0] && r.rows[0].value) || {} });
  }

  if (req.method === "POST" && action === "save") {
    const b = body(req);
    const next = {};
    FIELDS.forEach(function (f) { next[f] = clean(b[f]); });

    const wa = next.whatsapp.replace(/[\s\-()]/g, "");
    if (wa && !/^\+?\d{9,15}$/.test(wa)) {
      return res.status(400).json({ ok: false, error: "WhatsApp nömrəsi düzgün deyil (məs: +994501234567)." });
    }
    next.whatsapp = wa;
    if (next.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(next.email)) {
      return res.status(400).json({ ok: false, error: "E-poçt düzgün deyil." });
    }
    if (next.instagram && !/^https?:\/\//.test(next.instagram)) {
      return res.status(400).json({ ok: false, error: "Instagram linki https:// ilə başlamalıdır." });
    }
    if (next.tiktok && !/^https?:\/\//.test(next.tiktok)) {
      return res.status(400).json({ ok: false, error: "TikTok linki https:// ilə başlamalıdır." });
    }

    const cur = await pool.query("select value from site_settings where key = 'general'");
    if (cur.rowCount) {
      await pool.query(
        "update site_settings set value = $1::jsonb, updated_at = now() where key = 'general'",
        [JSON.stringify(next)]);
    } else {
      await pool.query(
        "insert into site_settings (key, value, updated_at) values ('general', $1::jsonb, now())",
        [JSON.stringify(next)]);
    }
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ ok: false, error: "Naməlum əməliyyat." });
};

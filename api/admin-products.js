const crypto = require("crypto");
const { pool } = require("./_db");
const { verify } = require("./_auth");

// Admin: yeni məhsul yaratmaq və şəkil yükləmək (yalnız admin token ilə)
const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,79}$/;
const IMG_RE = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+\/=]+)$/;
const MAX_BYTES = 2 * 1024 * 1024;

function body(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  return req.body;
}
function txt(v, max) {
  const s = String(v == null ? "" : v).trim();
  return s ? s.slice(0, max || 500) : null;
}

let imagesReady = null;
async function ensureImages() {
  if (!imagesReady) {
    imagesReady = pool.query(
      `create table if not exists product_images (
         id text primary key,
         mime text not null,
         data bytea not null,
         created_at timestamptz not null default now()
       )`
    ).catch(function (e) { imagesReady = null; throw e; });
  }
  return imagesReady;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const action = (req.query && req.query.action) || "";

  try {
    const h = req.headers.authorization || "";
    const p = verify(h.replace(/^Bearer\s+/i, "").trim());
    if (!p || p.role !== "admin") return res.status(401).json({ ok: false, error: "Admin girişi tələb olunur." });

    // ---------- ŞƏKİL YÜKLƏMƏ ----------
    if (req.method === "POST" && action === "image_upload") {
      const b = body(req);
      const m = IMG_RE.exec(String(b.data || ""));
      if (!m) return res.status(400).json({ ok: false, error: "Yalnız JPG, PNG və ya WEBP şəkil yükləyin." });
      const buf = Buffer.from(m[2], "base64");
      if (!buf.length) return res.status(400).json({ ok: false, error: "Şəkil boşdur." });
      if (buf.length > MAX_BYTES) return res.status(413).json({ ok: false, error: "Şəkil çox böyükdür (maksimum 2 MB)." });
      await ensureImages();
      const id = crypto.randomBytes(16).toString("hex");
      await pool.query("insert into product_images (id, mime, data) values ($1, $2, $3)", [id, m[1], buf]);
      return res.status(200).json({ ok: true, url: "/img/" + id });
    }

    // ---------- YENİ MƏHSUL ----------
    if (req.method === "POST" && action === "product_create") {
      const b = body(req);
      const slug = String(b.slug || "").trim().toLowerCase();
      const nameAz = txt(b.name_az, 200);
      if (!SLUG_RE.test(slug)) {
        return res.status(400).json({ ok: false, error: "Link adı yalnız kiçik latın hərfi, rəqəm və - ola bilər (2–80 simvol)." });
      }
      if (!nameAz) return res.status(400).json({ ok: false, error: "Azərbaycanca ad daxil edin." });

      const cat = txt(b.category_key, 40);
      if (cat) {
        const c = await pool.query("select 1 from categories where key = $1", [cat]);
        if (!c.rowCount) return res.status(400).json({ ok: false, error: "Kateqoriya tapılmadı." });
      }
      const img = txt(b.image_url, 300);
      if (img && !(img.charAt(0) === "/" || /^https:\/\//.test(img))) {
        return res.status(400).json({ ok: false, error: "Şəkil linki yanlışdır." });
      }
      const dup = await pool.query("select 1 from site_products where product_key = $1 or slug = $1", [slug]);
      if (dup.rowCount) return res.status(409).json({ ok: false, error: "Bu link adı artıq istifadə olunub." });

      const r = await pool.query(
        `insert into site_products
           (product_key, slug, name, name_az, name_ru, name_en, category_key, image_url, active, sort_order)
         values ($1, $1, $2, $2, $3, $4, $5, $6, $7,
                 (select coalesce(max(sort_order), 0) + 10 from site_products))
         returning product_key`,
        [slug, nameAz, txt(b.name_ru, 200), txt(b.name_en, 200), cat, img, b.active !== false]
      );
      return res.status(200).json({ ok: true, product_key: r.rows[0].product_key });
    }

    return res.status(400).json({ ok: false, error: "Naməlum əməliyyat." });
  } catch (e) {
    console.error("admin-products:", e);
    return res.status(500).json({ ok: false, error: "Server xətası." });
  }
};

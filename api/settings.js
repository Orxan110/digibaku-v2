const { pool } = require("./_db");

// Sayt parametrləri (ictimai oxunuş). Mənbə: site_settings, key = 'general'
const DEFAULTS = {
  site_name: "DigiBaku.com",
  logo_text: "DigiBaku",
  city_az: "Bakı, Azərbaycan", city_ru: "Баку, Азербайджан", city_en: "Baku, Azerbaijan",
  hours_az: "10:00–22:00", hours_ru: "10:00–22:00", hours_en: "10:00–22:00",
  whatsapp: "+994513626349",
  phone: "",
  email: "premium989b@gmail.com",
  instagram: "",
  tiktok: ""
};

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=120");
  try {
    const r = await pool.query("select value from site_settings where key = 'general'");
    const saved = r.rows[0] && r.rows[0].value ? r.rows[0].value : {};
    return res.status(200).json({ ok: true, settings: Object.assign({}, DEFAULTS, saved) });
  } catch (e) {
    console.error("settings:", e);
    return res.status(200).json({ ok: true, settings: DEFAULTS });
  }
};

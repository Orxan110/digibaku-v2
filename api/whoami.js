// Diaqnostika: giriş cookie-si serverə çatırmı və Neon sessiyanı qəbul edirmi.
// Cookie-nin dəyəri göstərilmir, yalnız adları.
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const cookie = req.headers.cookie || "";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "";
  const names = cookie ? cookie.split(";").map(s => s.trim().split("=")[0]) : [];
  let neon = null;
  try {
    const r = await fetch("https://" + host + "/api/auth/get-session", { headers: { cookie: cookie } });
    const text = await r.text();
    neon = { status: r.status, body: text.slice(0, 300) };
  } catch (e) {
    neon = { error: String(e && e.message || e) };
  }
  res.status(200).json({ hasCookie: cookie.length > 0, cookieNames: names, host: host, neon: neon });
};

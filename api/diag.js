// Diaqnostika: admin səhifəsindən gələn tokeni serverdən Neon-a göndərib cavabı göstərir.
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const h = req.headers.authorization || "";
  const token = h.replace(/^Bearer\s+/i, "").trim();
  const out = { hasAuthHeader: !!h, tokenLength: token.length, dotCount: token.split(".").length - 1 };
  try {
    const r = await fetch("https://ep-lively-math-betoma1f.neonauth.c-9.us-east-2.aws.neon.tech/neondb/auth/get-session", {
      headers: { Authorization: "Bearer " + token }
    });
    out.neonStatus = r.status;
    out.neonBody = (await r.text()).slice(0, 300);
  } catch (e) {
    out.neonError = String((e && e.message) || e);
  }
  res.status(200).json(out);
};

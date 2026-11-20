const crypto = require("crypto");

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

module.exports = { verify };

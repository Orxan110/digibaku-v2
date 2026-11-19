const https = require("https");

const TARGET_HOST = "ep-lively-math-betoma1f.neonauth.c-9.us-east-2.aws.neon.tech";
const TARGET_BASE = "/neondb/auth";

const DROP_REQ = ["host", "connection", "content-length", "x-forwarded-host", "x-forwarded-proto",
  "x-forwarded-for", "x-real-ip", "x-vercel-id", "x-vercel-forwarded-for", "accept-encoding"];
const DROP_RES = ["content-encoding", "transfer-encoding", "connection", "content-length"];

async function handler(req, res) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = chunks.length ? Buffer.concat(chunks) : null;

  const parts = req.query && req.query.path;
  const sub = Array.isArray(parts) ? parts.join("/") : (parts || "");
  const qi = req.url.indexOf("?");
  const qs = qi >= 0 ? req.url.slice(qi) : "";

  const headers = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (DROP_REQ.includes(k)) continue;
    headers[k] = v;
  }
  headers.host = TARGET_HOST;
  headers.origin = "https://" + (req.headers["x-forwarded-host"] || req.headers.host);
  if (body) headers["content-length"] = String(body.length);

  await new Promise((resolve) => {
    const up = https.request({
      host: TARGET_HOST,
      port: 443,
      method: req.method,
      path: TARGET_BASE + "/" + sub + qs,
      headers: headers
    }, (r) => {
      res.statusCode = r.statusCode;
      for (const [k, v] of Object.entries(r.headers)) {
        if (k === "set-cookie") {
          const list = Array.isArray(v) ? v : [v];
          res.setHeader("set-cookie", list.map(c => c.replace(/;\s*domain=[^;]*/i, "")));
        } else if (!DROP_RES.includes(k)) {
          res.setHeader(k, v);
        }
      }
      r.pipe(res);
      r.on("end", resolve);
      r.on("error", () => { res.end(); resolve(); });
    });
    up.on("error", (e) => {
      if (!res.headersSent) res.statusCode = 502;
      res.end(JSON.stringify({ error: "proxy_error", message: String(e && e.message || e) }));
      resolve();
    });
    if (body) up.write(body);
    up.end();
  });
}

handler.config = { api: { bodyParser: false } };
module.exports = handler;

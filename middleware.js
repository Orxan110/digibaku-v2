/* DigiBaku — IP ban middleware (Vercel Routing Middleware, Edge).
   Admin paneldə banlanmış IP-lər saytın səhifələrinə və API-sinə girə bilmir.
   Admin paneli (/neon009, /api/admin*) ban xaricindədir ki, admin özünü bloklamasın.
   Siyahı /api/shop?action=bans-dan oxunur və 60 saniyə yadda saxlanır. */

const CACHE_MS = 60 * 1000;
let cache = { at: 0, ips: new Set() };

function clientIp(req) {
  const h = req.headers;
  const raw = h.get("x-vercel-forwarded-for") || h.get("x-real-ip") || h.get("x-forwarded-for") || "";
  return String(raw).split(",")[0].trim();
}

async function bannedSet(origin) {
  const now = Date.now();
  if (now - cache.at < CACHE_MS) return cache.ips;
  try {
    const r = await fetch(origin + "/api/shop?action=bans&_=" + now, { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      cache = { at: now, ips: new Set((d && d.ips) || []) };
    } else {
      cache.at = now - CACHE_MS + 10000; // xəta: 10 san sonra yenidən cəhd (köhnə siyahı qalır)
    }
  } catch (e) {
    cache.at = now - CACHE_MS + 10000;
  }
  return cache.ips;
}

function pass() {
  return new Response(null, { headers: { "x-middleware-next": "1" } });
}

export default async function middleware(request) {
  const url = new URL(request.url);
  const p = url.pathname;

  // ban xaricindəkilər: admin paneli, admin API, ban siyahısı endpoint-i
  if (p === "/neon009" || p === "/neon009.html" || p.startsWith("/api/admin")) return pass();
  if (p === "/api/shop" && url.searchParams.get("action") === "bans") return pass();

  const ip = clientIp(request);
  if (!ip) return pass();

  const ips = await bannedSet(url.origin);
  if (!ips.has(ip)) return pass();

  const html = '<!doctype html><html lang="az"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1"><title>Giriş məhdudlaşdırılıb</title>' +
    '<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0b0b0b;color:#eee;font-family:system-ui,sans-serif;text-align:center;padding:20px}' +
    'h1{font-size:22px;margin:0 0 8px}p{color:#999;margin:0}</style></head><body><div>' +
    '<h1>Giriş məhdudlaşdırılıb</h1><p>Bu IP ünvanından sayta giriş bloklanıb.</p></div></body></html>';
  return new Response(html, {
    status: 403,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
  });
}

export const config = {
  matcher: ["/((?!_vercel|favicon.ico).*)"]
};

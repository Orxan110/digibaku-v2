// IP banı: banlanmış IP-lərdən gələn sorğulara saytın səhifələrində 403 cavabı verir.
// API, şəkil və admin paneli (neon009) bu yoxlamadan kənardadır ki, admin özünü bağlamasın.
const CACHE_MS = 60 * 1000;
let cache = { at: 0, ips: new Set() };

async function loadBans(origin) {
  if (Date.now() - cache.at < CACHE_MS) return cache.ips;
  try {
    const r = await fetch(origin + "/api/shop?action=bans");
    if (r.ok) {
      const d = await r.json();
      cache = { at: Date.now(), ips: new Set((d.ips || []).map(String)) };
    } else {
      cache.at = Date.now();
    }
  } catch (e) {
    cache.at = Date.now();
  }
  return cache.ips;
}

export const config = {
  matcher: ["/((?!api/|assets/|img/|neon009|favicon).*)"]
};

export default async function middleware(request) {
  const raw = request.headers.get("x-vercel-forwarded-for") || request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for") || "";
  const ip = raw.split(",")[0].trim();
  if (!ip) return;
  const bans = await loadBans(new URL(request.url).origin);
  if (bans.has(ip)) {
    return new Response("Girişiniz bloklanıb.", {
      status: 403,
      headers: { "content-type": "text/plain; charset=utf-8" }
    });
  }
  return;
}

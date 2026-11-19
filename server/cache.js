// Kataloq üçün qısa müddətli yaddaş keşi. Admin hər yazışdan sonra təmizləyir.
const TTL_MS = Number(process.env.CATALOG_CACHE_SECONDS ?? 30) * 1000;
const store = new Map();

export function getCached(key) {
  const hit = store.get(key);
  return hit && hit.exp > Date.now() ? hit.data : null;
}

export function setCached(key, data) {
  store.set(key, { data, exp: Date.now() + TTL_MS });
}

export function invalidateCatalog() {
  store.clear();
}

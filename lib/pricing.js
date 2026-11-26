// Ortaq qiymət məntiqi: məhsul siyahısı (products.js) və sifariş (orders.js) eyni qaydanı istifadə edir.
// Qayda: manual satış qiyməti (sale_*) və planlı endirim (scheduled_discounts) arasında AŞAĞI olan seçilir.

let discountsReady = null;
function ensureDiscountTable(pool) {
  if (!discountsReady) {
    discountsReady = pool.query(`create table if not exists scheduled_discounts (
        id serial primary key,
        name text not null,
        percent numeric(5,2) not null check (percent > 0 and percent < 100),
        product_keys text[],
        months integer[],
        starts_at timestamptz not null,
        ends_at timestamptz not null check (ends_at > starts_at),
        active boolean not null default true,
        created_at timestamptz not null default now())`)
      .catch(function (e) { discountsReady = null; throw e; });
  }
  return discountsReady;
}

// Hal-hazırda aktiv olan planlı endirimlər
async function activeDiscounts(pool) {
  await ensureDiscountTable(pool);
  const r = await pool.query(
    `select percent, product_keys, months from scheduled_discounts
     where active = true and starts_at <= now() and ends_at > now()`);
  return r.rows;
}

function round2(n) { return Math.round(n * 100) / 100; }

// Açar müqayisəsi: böyük-kiçik hərf və kənar boşluqlar fərq etmir; həm product_key, həm slug qəbul olunur
function normKey(v) { return String(v || "").trim().toLowerCase(); }

function bestPercent(list, row, months) {
  const ids = [normKey(row.product_key), normKey(row.slug)].filter(Boolean);
  let best = 0;
  for (const d of list) {
    if (d.product_keys && d.product_keys.length) {
      const wanted = d.product_keys.map(normKey);
      if (!ids.some(id => wanted.includes(id))) continue;
    }
    if (d.months && d.months.length && !d.months.includes(months)) continue;
    best = Math.max(best, Number(d.percent));
  }
  return best;
}

// r: product_prices sətri (+ product_key). Qaytarır: { price, old } və ya null (qiymət yoxdursa)
function unitPrice(r, months, list) {
  const base = Number(r[`price_${months}_month`]);
  if (!(base > 0)) return null;
  const sale = Number(r[`sale_${months}_price`]);
  let price = (r[`sale_${months}_active`] === true && sale > 0 && sale < base) ? sale : base;
  const pct = bestPercent(list, r, months);
  if (pct > 0) price = Math.min(price, round2(base * (100 - pct) / 100));
  price = round2(price);
  return { price: price, old: price < base ? round2(base) : null };
}

module.exports = { ensureDiscountTable, activeDiscounts, unitPrice, round2 };

import { MONTHS } from '../constants.js';
import { pickLang } from '../i18n.js';

/** Qiymət sətrindən müddət seçimləri. 0 və ya boş qiymət HEÇ VAXT göstərilmir. */
export function priceList(row) {
  if (!row) return [];
  const out = [];
  for (const m of MONTHS) {
    const base = Number(row[`price_${m}_month`]);
    if (!(base > 0)) continue;
    const sale = Number(row[`sale_${m}_price`]);
    const onSale = !!row[`sale_${m}_active`] && sale > 0 && sale < base;
    out.push({
      months: m,
      price: base,
      sale_price: onSale ? sale : null,
      current_price: onSale ? sale : base,
    });
  }
  return out;
}

export function productView(p, priceRow, lang) {
  return {
    key: p.product_key,
    slug: p.slug || p.product_key,
    name: pickLang(p, 'name', lang),
    description: pickLang(p, 'description', lang),
    features: p[`features_${lang}`] || p.features_az || [],
    image_url: p.image_url || null,
    category: p.category_key || null,
    is_featured: !!p.is_featured,
    sort_order: p.sort_order ?? 0,
    seo: p.seo || {},
    prices: priceList(priceRow),
  };
}

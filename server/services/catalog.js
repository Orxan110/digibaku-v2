import { db } from '../db/supabase.js';
import { pickLang } from '../i18n.js';
import { MONTHS } from '../constants.js';

/** 0 və ya boş qiymət HEÇ VAXT göstərilmir. */
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

/** Bütün ictimai sayt məzmununu bir dəstədə qurur */
export async function buildCatalog(lang) {
  const [products, prices, categories, banners, reviews, faqs, content, settings] =
    await Promise.all([
      db.list('site_products', { eq: { active: true }, order: 'sort_order' }),
      db.list('product_prices'),
      db.list('categories', { eq: { active: true }, order: 'sort_order' }),
      db.list('banners', { eq: { active: true }, order: 'sort_order' }),
      db.list('reviews', { eq: { status: 'approved', show_on_home: true }, order: 'sort_order' }),
      db.list('site_faqs', { eq: { active: true, language: lang }, order: 'sort_order' }),
      db.list('site_content'),
      db.list('site_settings'),
    ]);

  const byKey = {};
  for (const r of content) (byKey[r.key] ??= {})[r.lang] = r.value;
  const text = Object.fromEntries(
    Object.entries(byKey).map(([k, v]) => [k, v[lang] || v.az || ''])
  );

  const priceMap = new Map(prices.map((r) => [r.product_key, r]));

  return {
    lang,
    categories: categories.map((c) => ({
      key: c.key,
      name: pickLang(c, 'name', lang),
      icon: c.icon || null,
      visual_style: c.visual_style || 'default',
    })),
    products: products.map((p) => productView(p, priceMap.get(p.product_key), lang)),
    banners: banners.map((b) => ({
      id: b.id,
      title: pickLang(b, 'title', lang),
      subtitle: pickLang(b, 'subtitle', lang),
      cta_label: pickLang(b, 'cta_label', lang),
      cta_url: b.cta_url || null,
      image_url: b.image_url || null,
    })),
    reviews: reviews.map((r) => ({
      id: r.id,
      author: r.author_name,
      rating: r.rating,
      text: pickLang(r, 'body', lang),
      date: r.review_date,
    })),
    faqs: faqs.map((f) => ({
      id: f.id,
      product_key: f.product_key,
      question: f.question,
      answer: f.answer,
    })),
    content: text,
    settings: Object.fromEntries(settings.map((s) => [s.key, s.value])),
  };
}

import { db } from '../db/postgres.js';
import { pickLang } from '../i18n.js';
import { productView } from './pricing.js';

/*
 * Ana səhifə və digər ictimai səhifələr üçün bütün məzmunu bir dəfəyə yığır.
 * Hər cədvəl ayrıca oxunur, sonra formatlanır. Admin dəyişiklikləri növbəti sorğuda görünür.
 */
export async function buildCatalog(lang) {
  const [products, prices, categories, banners, reviews, faqs, content, settings] = await Promise.all([
    db.list('site_products', { eq: { active: true }, order: 'sort_order' }),
    db.list('product_prices'),
    db.list('categories', { eq: { active: true }, order: 'sort_order' }),
    db.list('banners', { eq: { active: true }, order: 'sort_order' }),
    db.list('reviews', { eq: { status: 'approved', show_on_home: true }, order: 'sort_order' }),
    db.list('site_faqs', { eq: { active: true, language: lang }, order: 'sort_order' }),
    db.list('site_content'),
    db.list('site_settings'),
  ]);

  // Mətnlər: seçilmiş dil yoxdursa AZ-a düşür
  const byKey = {};
  for (const r of content) {
    (byKey[r.key] ??= {})[r.lang] = r.value;
  }
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

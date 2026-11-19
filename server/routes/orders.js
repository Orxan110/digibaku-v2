import { Router } from 'express';
import { wrap, HttpError, round2 } from '../http.js';
import { db } from '../db/supabase.js';
import { requireCustomer } from '../auth.js';
import { priceList } from '../services/catalog.js';
import { pickLang, normLang } from '../i18n.js';
import { MONTHS } from '../constants.js';

export const ordersRouter = Router();

/**
 * Qiymət brauzerdən QƏBUL EDİLMİR: hər sətir üçün qiymət serverdə product_prices-dən hesablanır.
 * Body: { lang, items: [{ product_key, months, quantity }] }
 */
ordersRouter.post('/', requireCustomer, wrap(async (req, res) => {
  const raw = Array.isArray(req.body?.items) ? req.body.items : [];
  if (!raw.length || raw.length > 20) throw new HttpError(400, 'invalid_items');
  const lang = normLang(req.body?.lang);

  const items = [];
  for (const it of raw) {
    const key = String(it?.product_key || '');
    const months = Number(it?.months);
    const qty = Math.floor(Number(it?.quantity ?? 1));
    if (!key || !MONTHS.includes(months) || !(qty >= 1 && qty <= 10)) {
      throw new HttpError(400, 'invalid_items');
    }
    const product = await db.one('site_products', { product_key: key });
    if (!product || !product.active) throw new HttpError(400, 'product_unavailable');

    const priceRow = await db.one('product_prices', { product_key: key });
    const option = priceList(priceRow).find((p) => p.months === months);
    if (!option) throw new HttpError(400, 'price_unavailable');

    items.push({
      product_key: key,
      name: pickLang(product, 'name', lang),
      months,
      quantity: qty,
      unit_price: option.current_price,
    });
  }

  const total = round2(items.reduce((s, i) => s + i.unit_price * i.quantity, 0));
  const order = await db.insert('orders', {
    user_id: req.user.id,
    total,
    status: 'pending',
    items,
  });
  res.status(201).json({ id: order.id, total: order.total, status: order.status });
}));

ordersRouter.get('/mine', requireCustomer, wrap(async (req, res) => {
  res.json(await db.list('orders', {
    eq: { user_id: req.user.id },
    order: 'created_at',
    ascending: false,
    limit: 50,
  }));
}));

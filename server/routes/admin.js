import { Router } from 'express';
import express from 'express';
import { db } from '../db/supabase.js';
import { requireAdmin } from '../auth.js';
import { wrap, HttpError, pick, toNumber, round2, isSafeUrl } from '../http.js';
import { audit } from '../audit.js';
import { invalidateCatalog } from '../cache.js';
import { MONTHS, ORDER_STATUSES, LANGS } from '../constants.js';

export const adminRouter = Router();
const read = requireAdmin('support');
const write = requireAdmin('admin');

adminRouter.get('/me', read, (req, res) => res.json(req.admin));

function coerce(r) {
  if (r.sort_order !== undefined) r.sort_order = Number(r.sort_order) || 0;
  if (r.rating !== undefined) r.rating = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5)));
  if (r.product_key === '') r.product_key = null;
  if (r.key !== undefined) r.key = String(r.key).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  for (const f of ['image_url', 'cta_url']) {
    if (r[f] && !isSafeUrl(r[f])) throw new HttpError(400, 'invalid_url');
  }
  return r;
}

function crud(path, { table, idCol = 'id', fields, order = 'sort_order', defaults = {} }) {
  adminRouter.get(`/${path}`, read, wrap(async (req, res) => {
    res.json(await db.list(table, { order, ascending: true }));
  }));

  adminRouter.post(`/${path}`, write, wrap(async (req, res) => {
    const row = coerce({ ...defaults, ...pick(req.body, fields) });
    const created = await db.insert(table, row);
    invalidateCatalog();
    await audit(req, 'create', table, created[idCol]);
    res.status(201).json(created);
  }));

  adminRouter.put(`/${path}/:id`, write, wrap(async (req, res) => {
    const values = coerce(pick(req.body, fields));
    delete values[idCol];
    if (!Object.keys(values).length) throw new HttpError(400, 'nothing_to_update');
    const [row] = await db.update(table, { [idCol]: req.params.id }, values);
    if (!row) throw new HttpError(404, 'not_found');
    invalidateCatalog();
    await audit(req, 'update', table, req.params.id);
    res.json(row);
  }));

  adminRouter.delete(`/${path}/:id`, write, wrap(async (req, res) => {
    await db.remove(table, { [idCol]: req.params.id });
    invalidateCatalog();
    await audit(req, 'delete', table, req.params.id);
    res.status(204).end();
  }));
}

crud('categories', {
  table: 'categories',
  idCol: 'key',
  fields: ['key', 'name_az', 'name_ru', 'name_en', 'icon', 'visual_style', 'sort_order', 'active'],
  defaults: { active: true, sort_order: 0 },
});

crud('banners', {
  table: 'banners',
  fields: [
    'title_az', 'title_ru', 'title_en', 'subtitle_az', 'subtitle_ru', 'subtitle_en',
    'cta_label_az', 'cta_label_ru', 'cta_label_en', 'cta_url', 'image_url', 'sort_order', 'active',
  ],
  defaults: { active: true, sort_order: 0 },
});

crud('reviews', {
  table: 'reviews',
  fields: [
    'author_name', 'rating', 'body_az', 'body_ru', 'body_en', 'review_date',
    'status', 'show_on_home', 'sort_order',
  ],
  defaults: { status: 'approved', source: 'admin', show_on_home: false, sort_order: 0 },
});

crud('faqs', {
  table: 'site_faqs',
  fields: ['product_key', 'question', 'answer', 'language', 'sort_order', 'active'],
  defaults: { active: true, sort_order: 0 },
});

const PRODUCT_FIELDS = [
  'name', 'name_az', 'name_ru', 'name_en', 'slug', 'category_key',
  'description_az', 'description_ru', 'description_en',
  'image_url', 'sort_order', 'is_featured', 'active', 'seo',
];
const FEATURE_FIELDS = ['features_az', 'features_ru', 'features_en'];

function productRow(body) {
  const row = pick(body, PRODUCT_FIELDS);
  for (const f of FEATURE_FIELDS) {
    if (body[f] === undefined) continue;
    const list = Array.isArray(body[f]) ? body[f] : String(body[f]).split('\n');
    row[f] = list.map((s) => String(s).trim()).filter(Boolean).slice(0, 20);
  }
  if (row.sort_order !== undefined) row.sort_order = Number(row.sort_order) || 0;
  if (row.image_url && !isSafeUrl(row.image_url)) throw new HttpError(400, 'invalid_url');
  return row;
}

function priceValues(input) {
  const out = {};
  if (!input || typeof input !== 'object') return out;
  for (const m of MONTHS) {
    const e = input[m] ?? input[String(m)];
    if (!e) continue;
    const price = toNumber(e.price);
    const sale = toNumber(e.sale_price);
    const saleActive = !!e.sale_active;
    if ((price !== null && !(price > 0)) || (sale !== null && !(sale > 0))) {
      throw new HttpError(400, 'invalid_price');
    }
    if (saleActive && (price === null || sale === null || sale >= price)) {
      throw new HttpError(400, 'invalid_sale');
    }
    out[`price_${m}_month`] = price === null ? null : round2(price);
    out[`sale_${m}_price`] = sale === null ? null : round2(sale);
    out[`sale_${m}_active`] = saleActive;
  }
  return out;
}

const slugKey = (v) => String(v || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
adminRouter.get('/products', read, wrap(async (req, res) => {
  const [products, prices] = await Promise.all([
    db.list('site_products', { order: 'sort_order' }),
    db.list('product_prices'),
  ]);
  const pm = new Map(prices.map((p) => [p.product_key, p]));
  res.json(products.map((p) => ({ ...p, prices: pm.get(p.product_key) ?? null })));
}));

adminRouter.post('/products', write, wrap(async (req, res) => {
  const key = slugKey(req.body?.product_key);
  if (!key) throw new HttpError(400, 'product_key_required');
  const row = { ...productRow(req.body), product_key: key, slug: req.body.slug || key };
  const product = await db.insert('site_products', row);
  await db.upsert('product_prices', {
    product_key: key,
    product_name: row.name_az || row.name || key,
    ...priceValues(req.body.prices),
  }, 'product_key');
  invalidateCatalog();
  await audit(req, 'create', 'site_products', key);
  res.status(201).json(product);
}));

adminRouter.put('/products/:key', write, wrap(async (req, res) => {
  const key = req.params.key;
  const row = productRow(req.body);
  let product;
  if (Object.keys(row).length) {
    [product] = await db.update('site_products', { product_key: key }, row);
  } else {
    product = await db.one('site_products', { product_key: key });
  }
  if (!product) throw new HttpError(404, 'not_found');

  if (req.body.prices !== undefined) {
    await db.upsert('product_prices', {
      product_key: key,
      product_name: product.name_az || product.name || key,
      ...priceValues(req.body.prices),
    }, 'product_key');
  }
  invalidateCatalog();
  await audit(req, 'update', 'site_products', key);
  res.json(product);
}));

adminRouter.delete('/products/:key', write, wrap(async (req, res) => {
  const key = req.params.key;
  if (req.query.hard === '1') {
    await db.remove('product_prices', { product_key: key });
    await db.remove('site_products', { product_key: key });
  } else {
    await db.update('site_products', { product_key: key }, { active: false });
  }
  invalidateCatalog();
  await audit(req, req.query.hard === '1' ? 'hard_delete' : 'deactivate', 'site_products', key);
  res.status(204).end();
}));

const IMG_TYPES = { 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/avif': 'avif' };

adminRouter.post(
  '/upload',
  write,
  express.raw({ type: Object.keys(IMG_TYPES), limit: '5mb' }),
  wrap(async (req, res) => {
    const mime = (req.headers['content-type'] || '').split(';')[0];
    const ext = IMG_TYPES[mime];
    if (!ext || !Buffer.isBuffer(req.body) || !req.body.length) throw new HttpError(400, 'invalid_image');
    const folder = String(req.query.folder || 'misc').replace(/[^a-z0-9_-]/gi, '') || 'misc';
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const url = await db.uploadPublic(process.env.STORAGE_BUCKET || 'product-images', path, req.body, mime);
    await audit(req, 'upload', 'storage', path);
    res.status(201).json({ url });
  })
);

const KEY_RE = /^[a-z0-9_.-]{1,80}$/;
const SETTING_KEYS = ['site_name', 'logo_url', 'whatsapp', 'email', 'phone', 'address', 'chat_url', 'socials'];

adminRouter.get('/content', read, wrap(async (req, res) => {
  res.json(await db.list('site_content', { order: 'key' }));
}));

adminRouter.put('/content', write, wrap(async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (items.length > 500) throw new HttpError(400, 'too_many');
  for (const it of items) {
    if (!KEY_RE.test(it?.key) || !LANGS.includes(it?.lang)) throw new HttpError(400, 'invalid_content');
    if (String(it.value ?? '').length > 20000) throw new HttpError(400, 'too_long');
    await db.upsert('site_content', {
      key: it.key,
      lang: it.lang,
      value: String(it.value ?? ''),
      updated_at: new Date().toISOString(),
    }, 'key,lang');
  }
  invalidateCatalog();
  await audit(req, 'update', 'site_content', items.length);
  res.json({ ok: true, saved: items.length });
}));

adminRouter.get('/settings', read, wrap(async (req, res) => {
  res.json(await db.list('site_settings'));
}));

adminRouter.put('/settings', write, wrap(async (req, res) => {
  const values = req.body?.values && typeof req.body.values === 'object' ? req.body.values : {};
  const saved = [];
  for (const key of SETTING_KEYS) {
    if (values[key] === undefined) continue;
    await db.upsert('site_settings', {
      key,
      value: values[key],
      updated_at: new Date().toISOString(),
    }, 'key');
    saved.push(key);
  }
  invalidateCatalog();
  await audit(req, 'update', 'site_settings', saved.join(','));
  res.json({ ok: true, saved });
}));
adminRouter.get('/orders', read, wrap(async (req, res) => {
  res.json(await db.list('orders', {
    eq: { status: req.query.status },
    order: 'created_at',
    ascending: false,
    limit: 300,
  }));
}));

adminRouter.patch('/orders/:id/status', write, wrap(async (req, res) => {
  const status = req.body?.status;
  if (!ORDER_STATUSES.includes(status)) throw new HttpError(400, 'invalid_status');
  const [row] = await db.update('orders', { id: req.params.id }, {
    status,
    updated_at: new Date().toISOString(),
  });
  if (!row) throw new HttpError(404, 'not_found');
  await audit(req, 'status', 'orders', req.params.id);
  res.json(row);
}));

adminRouter.get('/customers', read, wrap(async (req, res) => {
  const [profiles, orders] = await Promise.all([
    db.list('profiles', { limit: 2000 }),
    db.list('orders', { select: 'user_id,total,status', limit: 10000 }),
  ]);
  const agg = {};
  for (const o of orders) {
    const a = (agg[o.user_id] ??= { orders_count: 0, total_spent: 0 });
    a.orders_count++;
    if (o.status !== 'cancelled') a.total_spent += Number(o.total) || 0;
  }
  res.json(profiles.map((p) => ({
    ...p,
    orders_count: agg[p.id]?.orders_count ?? 0,
    total_spent: round2(agg[p.id]?.total_spent ?? 0),
  })));
}));

adminRouter.get('/customers/:id', read, wrap(async (req, res) => {
  const [profile, orders] = await Promise.all([
    db.one('profiles', { id: req.params.id }),
    db.list('orders', { eq: { user_id: req.params.id }, order: 'created_at', ascending: false, limit: 100 }),
  ]);
  if (!profile) throw new HttpError(404, 'not_found');
  res.json({ profile, orders });
}));

adminRouter.get('/threads', read, wrap(async (req, res) => {
  const [msgs, profiles] = await Promise.all([
    db.list('messages', { order: 'created_at', ascending: false, limit: 3000 }),
    db.list('profiles', { select: 'id,email,full_name', limit: 5000 }),
  ]);
  const names = new Map(profiles.map((p) => [p.id, p]));
  const threads = new Map();
  for (const m of msgs) {
    let t = threads.get(m.user_id);
    if (!t) {
      t = {
        user_id: m.user_id,
        last_message: m.message,
        last_at: m.created_at,
        last_sender: m.sender_role,
        unread: 0,
        profile: names.get(m.user_id) ?? null,
      };
      threads.set(m.user_id, t);
    }
    if (m.sender_role === 'customer' && !m.is_read) t.unread++;
  }
  res.json([...threads.values()]);
}));

adminRouter.get('/threads/:userId', read, wrap(async (req, res) => {
  res.json(await db.list('messages', {
    eq: { user_id: req.params.userId },
    order: 'created_at',
    ascending: true,
    limit: 500,
  }));
}));

adminRouter.post('/threads/:userId', write, wrap(async (req, res) => {
  const text = String(req.body?.message || '').trim();
  if (!text || text.length > 2000) throw new HttpError(400, 'invalid_message');
  const row = await db.insert('messages', {
    user_id: req.params.userId,
    sender_role: 'admin',
    message: text,
    is_read: false,
  });
  await audit(req, 'reply', 'messages', req.params.userId);
  res.status(201).json(row);
}));

adminRouter.patch('/threads/:userId/read', read, wrap(async (req, res) => {
  await db.update('messages', { user_id: req.params.userId, sender_role: 'customer' }, { is_read: true });
  res.json({ ok: true });
}));

adminRouter.get('/stats', read, wrap(async (req, res) => {
  const [orders, profiles, newMessages, pendingReviews, products] = await Promise.all([
    db.list('orders', { order: 'created_at', ascending: false, limit: 10000 }),
    db.list('profiles', { select: 'id', limit: 100000 }),
    db.list('messages', { select: 'id', eq: { sender_role: 'customer', is_read: false }, limit: 5000 }),
    db.list('reviews', { select: 'id', eq: { status: 'pending' }, limit: 5000 }),
    db.list('site_products', { select: 'product_key,name,name_az' }),
  ]);

  const byStatus = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0]));
  let revenue = 0;
  const perProduct = {};
  const perDay = {};

  for (const o of orders) {
    byStatus[o.status] = (byStatus[o.status] || 0) + 1;
    const total = Number(o.total) || 0;
    if (o.status === 'completed') revenue += total;

    const day = String(o.created_at).slice(0, 10);
    const d = (perDay[day] ??= { date: day, orders: 0, revenue: 0 });
    d.orders++;
    if (o.status === 'completed') d.revenue += total;

    for (const it of Array.isArray(o.items) ? o.items : []) {
      const p = (perProduct[it.product_key] ??= { product_key: it.product_key, name: it.name, quantity: 0, revenue: 0 });
      const q = Number(it.quantity) || 0;
      p.quantity += q;
      if (o.status === 'completed') p.revenue += (Number(it.unit_price) || 0) * q;
    }
  }

  res.json({
    orders_total: orders.length,
    orders_by_status: byStatus,
    new_orders: byStatus.pending,
    revenue_completed: round2(revenue),
    customers: profiles.length,
    new_messages: newMessages.length,
    pending_reviews: pendingReviews.length,
    products_count: products.length,
    top_products: Object.values(perProduct)
      .map((p) => ({ ...p, revenue: round2(p.revenue) }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10),
    daily: Object.values(perDay)
      .sort((a, b) => (a.date

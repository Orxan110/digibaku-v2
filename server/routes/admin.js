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

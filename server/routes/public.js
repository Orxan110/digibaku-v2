import { Router } from 'express';
import { wrap, HttpError } from '../http.js';
import { normLang } from '../i18n.js';
import { buildCatalog } from '../services/catalog.js';
import { getCached, setCached } from '../cache.js';
import { db } from '../db/postgres.js';
import { requireCustomer } from '../auth.js';
import { authConfig } from '../services/supabase.js';

export const publicRouter = Router();

/** Brauzerin lazım olan yalnız ictimai konfiqurasiyası (service-role heç vaxt göndərilmir) */
publicRouter.get('/config', (req, res) => res.json(authConfig()));

publicRouter.get('/catalog', wrap(async (req, res) => {
  const lang = normLang(req.query.lang);
  let data = getCached(lang);
  if (!data) {
    data = await buildCatalog(lang);
    setCached(lang, data);
  }
  res.set('Cache-Control', 'public, max-age=30');
  res.json(data);
}));

/** Müştəri rəy göndərir → admin təsdiqləyənə qədər "pending" qalır */
publicRouter.post('/reviews', requireCustomer, wrap(async (req, res) => {
  const b = req.body || {};
  const rating = Number(b.rating);
  const text = String(b.text || '').trim();
  const author = String(b.author_name || '').trim().slice(0, 60);
  if (!author || text.length < 10 || text.length > 1000 || !(rating >= 1 && rating <= 5)) {
    throw new HttpError(400, 'invalid_review');
  }
  const lang = normLang(b.lang);
  await db.insert('reviews', {
    author_name: author,
    rating,
    [`body_${lang}`]: text,
    status: 'pending',
    show_on_home: false,
    source: 'customer',
    user_id: req.user.id,
  });
  res.status(201).json({ ok: true, status: 'pending' });
}));

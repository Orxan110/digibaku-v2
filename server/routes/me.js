import { Router } from 'express';
import { wrap, HttpError } from '../http.js';
import { db } from '../db/postgres.js';
import { requireCustomer } from '../auth.js';

/* Müştərinin öz məlumatları: profil və çat. Hamısı token tələb edir. */
export const meRouter = Router();
meRouter.use(requireCustomer);

/** Girişdən sonra profili yaradır/yeniləyir (Supabase Auth + Neon profiles) */
meRouter.post('/sync', wrap(async (req, res) => {
  const profile = await db.upsert('profiles', {
    id: req.user.id,
    email: req.user.email ?? null,
    full_name: req.user.user_metadata?.full_name || undefined,
  }, 'id');
  res.json(profile);
}));

meRouter.get('/profile', wrap(async (req, res) => {
  const profile = await db.one('profiles', { id: req.user.id });
  res.json(profile ?? { id: req.user.id, email: req.user.email ?? null, full_name: null });
}));

meRouter.put('/profile', wrap(async (req, res) => {
  const fullName = String(req.body?.full_name ?? '').trim().slice(0, 80) || null;
  const profile = await db.upsert('profiles', {
    id: req.user.id,
    email: req.user.email ?? null,
    full_name: fullName,
  }, 'id');
  res.json(profile);
}));

meRouter.get('/chat', wrap(async (req, res) => {
  res.json(await db.list('messages', {
    eq: { user_id: req.user.id },
    order: 'created_at',
    ascending: true,
    limit: 300,
  }));
}));

meRouter.post('/chat', wrap(async (req, res) => {
  const text = String(req.body?.message ?? '').trim();
  if (!text || text.length > 2000) throw new HttpError(400, 'invalid_message');
  const row = await db.insert('messages', {
    user_id: req.user.id,
    sender_role: 'customer',
    message: text,
    is_read: false,
  });
  res.status(201).json(row);
}));

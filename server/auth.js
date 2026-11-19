import { db } from './db/postgres.js';
import { getUserFromToken } from './services/supabase.js';
import { HttpError, wrap } from './http.js';

const RANK = { support: 1, admin: 2, owner: 3 };

function bearer(req) {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7).trim() : '';
}

/** Daxil olmuş istifadəçi (Supabase Auth token-i serverdə yoxlanılır) */
export const requireCustomer = wrap(async (req, res, next) => {
  const user = await getUserFromToken(bearer(req));
  if (!user) throw new HttpError(401, 'unauthorized');
  req.user = user;
  next();
});

/** Admin: token → Supabase Auth → admin_users (Neon). Brauzer yoxlaması etibar edilmir. */
export const requireAdmin = (minRole = 'support') =>
  wrap(async (req, res, next) => {
    const user = await getUserFromToken(bearer(req));
    if (!user) throw new HttpError(401, 'unauthorized');
    const row = await db.one('admin_users', { user_id: user.id });
    if (!row || !row.active || RANK[row.role] < RANK[minRole]) throw new HttpError(403, 'forbidden');
    req.user = user;
    req.admin = { id: user.id, email: user.email, role: row.role };
    next();
  });

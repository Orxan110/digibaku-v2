import { db } from './db/supabase.js';

/** Admin əməliyyatlarını qeyd edir. Uğursuz olsa da əsas əməliyyatı dayandırmır. */
export async function audit(req, action, entity, entityId) {
  try {
    await db.insert('admin_audit', {
      actor_id: req.admin?.id ?? null,
      action,
      entity,
      entity_id: String(entityId ?? ''),
    });
  } catch (e) {
    console.warn('[audit] yazıla bilmədi:', e.message);
  }
}

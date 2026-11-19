// Admin təyin etmək: node --env-file=.env scripts/grant-admin.mjs <email> <owner|admin|support>
// Əvvəl həmin e-poçtla Supabase Auth-da istifadəçi yaradılmalıdır.
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

const [email, role = 'owner'] = process.argv.slice(2);
if (!email || !['owner', 'admin', 'support'].includes(role)) {
  console.error('İstifadə: node --env-file=.env scripts/grant-admin.mjs <email> <owner|admin|support>');
  process.exit(1);
}
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.DATABASE_URL) {
  console.error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY və DATABASE_URL .env-də təyin edilməlidir.');
  process.exit(1);
}

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let user = null;
for (let page = 1; page <= 50 && !user; page++) {
  const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
  if (error) throw error;
  user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
  if (data.users.length < 200) break;
}
if (!user) {
  console.error('Bu e-poçtla Supabase Auth istifadəçisi tapılmadı. Əvvəl Authentication → Users-də yaradın.');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: true } });
await pool.query(
  `insert into admin_users (user_id, role, active) values ($1, $2, true)
   on conflict (user_id) do update set role = excluded.role, active = true`,
  [user.id, role]
);
await pool.end();
console.log(`✓ ${email} → ${role} rolu təyin olundu.`);

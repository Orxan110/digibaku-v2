// =====================================================================
// KÖHNƏ SUPABASE → NEON köçürmə skripti
//
// TƏHLÜKƏSİZLİK:
//  • MƏNBƏ (köhnə Supabase) yalnız OXUNUR: "read only" transaksiyada SELECT.
//    Heç bir INSERT/UPDATE/DELETE mənbədə icra olunmur.
//  • Varsayılan rejim QURU-QURU (dry-run): yalnız nə köçəcəyini göstərir.
//  • Real köçürmə üçün --apply bayrağı lazımdır.
//  • Təkrar işə salmaq təhlükəsizdir: mövcud sətirlər "on conflict do nothing" ilə dəyişmir.
//
// İSTİFADƏ:
//   npm run migrate              (yoxlama)
//   npm run migrate:apply        (real köçürmə)
// =====================================================================
import pg from 'pg';

const APPLY = process.argv.includes('--apply');
const SRC = process.env.SOURCE_DATABASE_URL; // köhnə Supabase Postgres (direct connection)
const DST = process.env.DATABASE_URL;        // Neon

if (!SRC || !DST) {
  console.error('SOURCE_DATABASE_URL və DATABASE_URL .env-də təyin edilməlidir.');
  process.exit(1);
}

// Köhnə cədvəllər. Sıra vacibdir (profiles əvvəl gəlir).
const TABLES = ['profiles', 'categories', 'site_products', 'product_prices', 'site_faqs', 'orders', 'messages'];
const BATCH = 200;

// Obyekt/massiv → JSON (jsonb sütunları üçün)
const norm = (v) => (v !== null && typeof v === 'object' && !(v instanceof Date) ? JSON.stringify(v) : v);

const src = new pg.Client({ connectionString: SRC, ssl: { rejectUnauthorized: false } });
const dst = new pg.Client({ connectionString: DST, ssl: { rejectUnauthorized: true } });

await src.connect();
await dst.connect();
console.log(APPLY ? '>>> REAL KÖÇÜRMƏ rejimi' : '>>> QURU-QURU (dry-run) rejimi — heç nə yazılmır');

await src.query('begin read only'); // mənbə yalnız oxunur
try {
  for (const table of TABLES) {
    const exists = await src.query('select to_regclass($1) as t', [`public.${table}`]);
    if (!exists.rows[0].t) {
      console.log(`- ${table}: mənbədə yoxdur, keçildi`);
      continue;
    }
    const targetCols = (await dst.query(
      `select column_name from information_schema.columns where table_schema = 'public' and table_name = $1`,
      [table]
    )).rows.map((r) => r.column_name);
    if (!targetCols.length) {
      console.log(`! ${table}: Neon-da cədvəl yoxdur. Əvvəl sql/neon/001_schema.sql işə salın.`);
      continue;
    }

    const { rows } = await src.query(`select * from public.${table}`);
    if (!rows.length) {
      console.log(`• ${table}: boşdur`);
      continue;
    }
    const srcCols = Object.keys(rows[0]);
    const cols = srcCols.filter((c) => targetCols.includes(c));
    const skipped = srcCols.filter((c) => !targetCols.includes(c));
    console.log(`• ${table}: ${rows.length} sətir, ${cols.length} sütun uyğundur` +
      (skipped.length ? `; Neon-da olmayan (köçmür): ${skipped.join(', ')}` : ''));

    if (!APPLY) continue;

    let done = 0;
    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH);
      const params = [];
      const tuples = chunk.map((r) => `(${cols.map((c) => {
        params.push(norm(r[c]));
        return `$${params.length}`;
      }).join(', ')})`);
      await dst.query(
        `insert into ${table} (${cols.map((c) => `"${c}"`).join(', ')}) values ${tuples.join(', ')} on conflict do nothing`,
        params
      );
      done += chunk.length;
    }
    console.log(`  ✓ ${done} sətir göndərildi`);
  }
} finally {
  await src.query('rollback');
  await src.end();
  await dst.end();
}
console.log(APPLY ? 'Köçürmə bitdi.' : 'Yoxlama bitdi. Real köçürmə üçün: npm run migrate:apply');

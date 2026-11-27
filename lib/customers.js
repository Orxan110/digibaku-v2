// Müştəri profili, ban, balans, keşbek cədvəlləri və keşbek hesablaması
let customersReady = null;
function ensureCustomerTables(pool) {
  if (!customersReady) {
    customersReady = (async function () {
      await pool.query(`create table if not exists customer_profiles (
        user_id text primary key,
        note text,
        blocked boolean not null default false,
        balance numeric(10,2) not null default 0,
        updated_at timestamptz not null default now())`);
      await pool.query("alter table customer_profiles add column if not exists phone text");
      await pool.query("alter table customer_profiles add column if not exists last_ip text");
      await pool.query(`create table if not exists customer_ledger (
        id bigserial primary key,
        user_id text not null,
        amount numeric(10,2) not null,
        reason text,
        created_at timestamptz not null default now())`);
      await pool.query(`create table if not exists banned_ips (
        ip text primary key,
        reason text,
        created_at timestamptz not null default now())`);
      await pool.query(`create table if not exists cashback_config (
        id integer primary key default 1,
        percent numeric(5,2) not null default 10 check (percent >= 0 and percent <= 50))`);
      await pool.query("insert into cashback_config (id, percent) values (1, 10) on conflict (id) do nothing");
      // Mövcud sifarişlər üçün keşbek artıq hesablanmış sayılır (default true); yeni sifarişlər false ilə yaranır
      await pool.query("alter table orders add column if not exists cashback_done boolean not null default true");
      await pool.query("alter table orders add column if not exists cashback_amount numeric(10,2) not null default 0");
      await pool.query("alter table orders add column if not exists balance_reverted boolean not null default true");
    })().catch(function (e) { customersReady = null; throw e; });
  }
  return customersReady;
}

// Sifariş ödənildikdə (confirmed/completed) keşbeki bir dəfə balansa yazır
async function creditCashback(db, orderId) {
  const r = await db.query(
    "update orders set cashback_done = true where id = $1 and cashback_done = false returning user_id, total",
    [String(orderId)]);
  if (!r.rowCount) return 0;
  const cfg = await db.query("select percent from cashback_config where id = 1");
  const pct = cfg.rows[0] ? Number(cfg.rows[0].percent) : 0;
  const amount = Math.round(Number(r.rows[0].total) * pct) / 100;
  if (!(amount > 0)) return 0;
  const userId = r.rows[0].user_id;
  await db.query(
    "insert into customer_profiles (user_id, balance) values ($1, 0) on conflict (user_id) do nothing", [userId]);
  await db.query(
    "update customer_profiles set balance = balance + $2, updated_at = now() where user_id = $1", [userId, amount]);
  await db.query("update orders set cashback_amount = $2 where id = $1", [String(orderId), amount]);
  await db.query(
    "insert into customer_ledger (user_id, amount, reason) values ($1, $2, $3)",
    [userId, amount, "Keşbek (" + pct + "%) · Sifariş #" + String(orderId).slice(0, 8)]);
  return amount;
}

// Sifariş ləğv olunduqda: işlədilən balans qaytarılır, alınmış keşbek geri götürülür (bir dəfə)
async function reverseOrder(db, orderId) {
  const r = await db.query(
    `update orders set balance_reverted = true where id = $1 and balance_reverted = false
     returning user_id, balance_used, cashback_amount`, [String(orderId)]);
  if (!r.rowCount) return;
  const o = r.rows[0];
  const uid = o.user_id;
  const tag = "Sifariş #" + String(orderId).slice(0, 8);
  await db.query(
    "insert into customer_profiles (user_id, balance) values ($1, 0) on conflict (user_id) do nothing", [uid]);
  const used = Number(o.balance_used || 0);
  if (used > 0) {
    await db.query(
      "update customer_profiles set balance = balance + $2, updated_at = now() where user_id = $1", [uid, used]);
    await db.query(
      "insert into customer_ledger (user_id, amount, reason) values ($1, $2, $3)",
      [uid, used, "Ləğv: balans qaytarıldı · " + tag]);
  }
  const cb = Number(o.cashback_amount || 0);
  if (cb > 0) {
    const cur = await db.query("select balance from customer_profiles where user_id = $1", [uid]);
    const have = cur.rows[0] ? Number(cur.rows[0].balance) : 0;
    const take = Math.min(cb, have);
    if (take > 0) {
      await db.query(
        "update customer_profiles set balance = balance - $2, updated_at = now() where user_id = $1", [uid, take]);
      await db.query(
        "insert into customer_ledger (user_id, amount, reason) values ($1, $2, $3)",
        [uid, -take, "Ləğv: keşbek geri alındı · " + tag]);
    }
  }
}

module.exports = { ensureCustomerTables, creditCashback, reverseOrder };

// Müştəri profili cədvəlləri: qeyd, bloklama, balans və balans tarixçəsi
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
      await pool.query(`create table if not exists customer_ledger (
        id bigserial primary key,
        user_id text not null,
        amount numeric(10,2) not null,
        reason text,
        created_at timestamptz not null default now())`);
    })().catch(function (e) { customersReady = null; throw e; });
  }
  return customersReady;
}
module.exports = { ensureCustomerTables };

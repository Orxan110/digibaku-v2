-- =====================================================================
-- DigiBaku v2 — 001: ƏLAVƏ EDİCİ (ADDITIVE) MİQRASİYA
-- Heç bir cədvəli silmir, sütunun adını dəyişmir, məlumatı təmizləmir.
-- Supabase SQL Editor-da bir dəfə işə salın.
-- =====================================================================

-- ---------- 1. Admin istifadəçiləri (rollar SERVERDƏ yoxlanılır) ----------
create table if not exists public.admin_users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'admin' check (role in ('owner','admin','support')),
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_audit (
  id         bigint generated always as identity primary key,
  actor_id   uuid,
  action     text not null,
  entity     text not null,
  entity_id  text,
  created_at timestamptz not null default now()
);

-- ---------- 2. Mövcud site_products cədvəlinə əlavə sütunlar ----------
alter table public.site_products
  add column if not exists name_ru        text,
  add column if not exists name_en        text,
  add column if not exists slug           text,
  add column if not exists category_key   text,
  add column if not exists description_az text,
  add column if not exists description_ru text,
  add column if not exists description_en text,
  add column if not exists features_az    jsonb not null default '[]'::jsonb,
  add column if not exists features_ru    jsonb not null default '[]'::jsonb,
  add column if not exists features_en    jsonb not null default '[]'::jsonb,
  add column if not exists image_url      text,
  add column if not exists sort_order     int   not null default 0,
  add column if not exists is_featured    boolean not null default false,
  add column if not exists active         boolean not null default true,
  add column if not exists seo            jsonb not null default '{}'::jsonb;

-- ---------- 3. Sifarişlər: məhsul sətirləri (items) ----------
alter table public.orders
  add column if not exists items      jsonb not null default '[]'::jsonb,
  add column if not exists updated_at timestamptz default now();

-- ---------- 4. Kateqoriyalar ----------
create table if not exists public.categories (
  key          text primary key,
  name_az      text not null,
  name_ru      text,
  name_en      text,
  icon         text,
  visual_style text not null default 'default',
  sort_order   int  not null default 0,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

-- ---------- 5. Bannerlər ----------
create table if not exists public.banners (
  id            uuid primary key default gen_random_uuid(),
  title_az      text, title_ru text, title_en text,
  subtitle_az   text, subtitle_ru text, subtitle_en text,
  cta_label_az  text, cta_label_ru text, cta_label_en text,
  cta_url       text,
  image_url     text,
  sort_order    int not null default 0,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ---------- 6. Müştəri rəyləri (moderasiya ilə) ----------
create table if not exists public.reviews (
  id            uuid primary key default gen_random_uuid(),
  author_name   text not null,
  rating        smallint not null default 5 check (rating between 1 and 5),
  body_az       text, body_ru text, body_en text,
  review_date   date not null default current_date,
  status        text not null default 'pending' check (status in ('pending','approved','rejected')),
  show_on_home  boolean not null default false,
  sort_order    int not null default 0,
  source        text not null default 'admin' check (source in ('admin','customer')),
  user_id       uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

-- ---------- 7. Mətnlər (AZ/RU/EN) ----------
create table if not exists public.site_content (
  key        text not null,
  lang       text not null check (lang in ('az','ru','en')),
  value      text,
  updated_at timestamptz not null default now(),
  primary key (key, lang)
);

-- ---------- 8. Sayt parametrləri ----------
create table if not exists public.site_settings (
  key        text primary key,
  value      jsonb not null default 'null'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------- 9. RLS ----------
alter table public.categories    enable row level security;
alter table public.banners       enable row level security;
alter table public.reviews       enable row level security;
alter table public.site_content  enable row level security;
alter table public.site_settings enable row level security;
alter table public.admin_users   enable row level security;
alter table public.admin_audit   enable row level security;

drop policy if exists "categories_read" on public.categories;
create policy "categories_read" on public.categories for select using (active = true);

drop policy if exists "banners_read" on public.banners;
create policy "banners_read" on public.banners for select using (active = true);

drop policy if exists "reviews_read" on public.reviews;
create policy "reviews_read" on public.reviews for select using (status = 'approved');

drop policy if exists "content_read" on public.site_content;
create policy "content_read" on public.site_content for select using (true);

drop policy if exists "settings_read" on public.site_settings;
create policy "settings_read" on public.site_settings for select using (true);

-- ---------- 10. Şəkil saxlancı (Storage) ----------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- ---------- 11. Sahibi (owner) təyin edin ----------
-- Əvvəlcə Supabase Authentication → Users-də öz istifadəçinizi yaradın.
-- Sonra aşağıdakı sətri şərhdən çıxarın, e-poçtu öz e-poçtunuzla əvəz edin və işə salın:
-- insert into public.admin_users (user_id, role)
-- select id, 'owner' from auth.users where email = 'SIZIN_EMAIL@example.com'
-- on conflict (user_id) do nothing;

# DigiBaku v2 — Rəqəmsal mağaza

Bu layihə iki xidmətdən istifadə edir:

| Xidmət | Nə üçün | Harada |
|---|---|---|
| **Neon (PostgreSQL)** | Bütün məlumatlar: məhsullar, qiymətlər, sifarişlər, rəylər, FAQ, mətnlər, çat, profillər | Neon |
| **Supabase** | Yalnız **Auth** (qeydiyyat, giriş, şifrə bərpası) və **Storage** (məhsul şəkilləri) | Supabase |
| **Vercel** | Sayt və API-nin yerləşdirilməsi | Vercel |

Admin paneli (`/gizli_panel.html`) bütün məzmunu idarə edir. Kodda heç bir parol, açar və ya admin e-poçtu yoxdur.

> **Əsas qayda:** köhnə `digibaku.com` saytına və onun Supabase layihəsinin məlumatlarına **toxunmayın**. Bu layihəni ayrıca Vercel layihəsi və ayrıca Neon bazası ilə qurun. Köhnə Supabase-dən yalnız **oxumaq** üçün istifadə olunur (köçürmə skripti heç nə yazmır).

---

## 1. Lazım olan hesablar

- **GitHub** (kodu saxlamaq üçün) — ixtiyari, amma Vercel üçün tövsiyə olunur
- **Neon** — neon.tech (pulsuz plan kifayətdir)
- **Supabase** — yeni, **test** üçün ayrıca layihə (tövsiyə olunur)
- **Vercel** — vercel.com
- **Node.js 20 və ya yuxarı** kompüterinizdə (yerli yoxlama üçün)

Kompüterdə işləmək daha rahatdır. Telefondan yalnız baxış və kiçik dəyişikliklər üçün istifadə edin.

---

## 2. Neon bazası yaradın

1. neon.tech → **New Project** → adı: `digibaku-test`.
2. Yaradılandan sonra **Connection Details** bölməsində **Pooled connection** seçin və connection string-i kopyalayın. Belə görünür:
   `postgresql://USER:PASSWORD@ep-xxxx-pooler.region.aws.neon.tech/neondb?sslmode=require`
3. Bu sətri bir yerdə saxlayın. Onu `.env` faylında `DATABASE_URL` kimi yazacaqsınız.
4. Neon **SQL Editor**-u açın, `sql/neon/001_schema.sql` faylının bütün mətnini yapışdırın və **Run** basın. Xəta olmamalıdır.
5. İsteğe bağlı: `sql/neon/002_seed_catalog.sql` faylını da eyni qaydada işə salın (12 məhsul, kateqoriyalar və qiymətlər). Əgər köhnə məlumatları köçürəcəksinizsə, bu addımı **ötürün** — köçürmə məhsulları özü gətirəcək.

---

## 3. Supabase layihəsini hazırlayın (yalnız Auth və Storage üçün)

**Tövsiyə:** test üçün **yeni** Supabase layihəsi yaradın. Beləliklə köhnə saytın müştəri hesabları toxunulmaz qalır. Yeni layihədə müştərilər yenidən qeydiyyatdan keçəcək.

Əgər köhnə Supabase layihəsindəki müştəri hesablarını da istifadə etmək istəyirsinizsə, bu, köhnə saytı təsir edə bilər. Bu qərarı verməzdən əvvəl mənə deyin.

1. supabase.com → **New project** → adı: `digibaku-test`.
2. **Authentication → Providers → Email** aktiv olsun.
3. **Authentication → Sign In / Providers** bölməsində **Confirm email** seçimini istədiyiniz kimi təyin edin. Test üçün söndürmək rahatdır, amma canlıda yandırılmalıdır.
4. **Storage → New bucket**: adı `product-images`, **Public bucket** qutusunu işarələyin.
5. **Project Settings → API**-dən kopyalayın:
   - `Project URL` → `SUPABASE_URL`
   - `anon public` açarı → `SUPABASE_ANON_KEY`
   - `service_role` açarı → `SUPABASE_SERVICE_ROLE_KEY` (**gizli**)

---

## 4. Yerli kompüterdə işə salın (tövsiyə olunur)

1. Layihə qovluğunu kompüterdə açın, terminalda həmin qovluğa keçin.
2. Asılılıqları quraşdırın:
   ```bash
   npm install
   ```
3. `.env.example` faylını **`.env`** adı ilə kopyalayın və dəyərləri doldurun:
   ```bash
   cp .env.example .env        # Windows: copy .env.example .env
   ```
   Bu faylı açıb `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` dəyərlərini yazın.
4. Testləri işə salın:
   ```bash
   npm test
   ```
   Dörd test keçməlidir.
5. Serveri işə salın:
   ```bash
   npm run dev
   ```
6. Brauzerdə açın:
   - `http://localhost:3000` — sayt
   - `http://localhost:3000/api/health` — `{"ok":true}` görünməlidir
   - `http://localhost:3000/api/public/catalog` — məhsullar JSON kimi görünməlidir

---

## 5. Admin istifadəçi yaradın

1. Supabase → **Authentication → Users → Add user → Create new user**. E-poçt və güclü şifrə yazın. **Auto Confirm User** qutusunu işarələyin.
2. Yerli terminalda (`.env` təyin olunmuş halda):
   ```bash
   npm run grant-admin -- sizin@email.com owner
   ```
   Nəticədə `✓ ... → owner rolu təyin olundu.` yazısı görünməlidir.
3. Brauzerdə `http://localhost:3000/gizli_panel.html` açın və həmin e-poçt və şifrə ilə daxil olun.

Rollar: `owner` (hər şey), `admin` (dəyişiklik edə bilər), `support` (yalnız baxa bilər və çata cavab verə bilər).

---

## 6. Köhnə məlumatları Neon-a köçürün (isteğe bağlı, lakin tövsiyə olunur)

Bu addım köhnə Supabase bazasındakı məhsulları, qiymətləri, FAQ-ı, sifarişləri, mesajları və profilləri Neon-a köçürür.

**Təhlükəsizlik:** mənbə yalnız oxunur (`begin read only` + `rollback`). Heç bir sətir köhnə bazada dəyişmir. Köçürmə təkrar işə salına bilər, mövcud sətirlər üzərinə yazılmır.

1. Köhnə Supabase layihəsinin **Project Settings → Database → Connection string → Direct connection** sətrini kopyalayın (parol daxil olmaqla).
2. `.env` faylına əlavə edin:
   ```
   SOURCE_DATABASE_URL=postgresql://postgres:PAROL@db.XXXX.supabase.co:5432/postgres
   ```
3. Əvvəl **quru-quru** yoxlayın (heç nə yazılmır):
   ```bash
   npm run migrate
   ```
   Hər cədvəl üçün neçə sətir olduğu və hansı sütunların köçəcəyi göstərilir. Əgər "Neon-da cədvəl yoxdur" xətası görsəniz, əvvəl 2-ci addımı yerinə yetirin.
4. Nəticə düzgündürsə, real köçürməni işə salın:
   ```bash
   npm run migrate:apply
   ```
5. İşi bitirdikdən sonra `.env`-dən `SOURCE_DATABASE_URL` sətrini **silin**.

**Yoxlamaq üçün:** Neon SQL Editor-da `select count(*) from site_products;` və `select count(*) from orders;` işə salın və nəticəni köhnə saytın admin statistikası ilə müqayisə edin.

Köçürmə skripti köhnə Supabase-dəki `id` tiplərinə görə işləyir: `orders` və `messages` cədvəllərində `id` mətn kimi saxlanılır, ona görə həm rəqəm, həm uuid köçə bilir.

**Diqqət:** köhnə bazada `durations`, `customer_products` kimi sütunlar və cədvəllər yeni sxemdə yoxdur. Skript onları atlayır və xəbər verir. Lazım gələrsə onları ayrıca sxemə əlavə edəcəyik.

---

## 7. Vercel-də yerləşdirin

1. **Kodu GitHub-a yükləyin.** Kompüterdə yeni repository yaradın (`digibaku-v2`) və layihə qovluğunun **məzmununu** yükləyin. `.env` faylını yükləməyin — `.gitignore` onu avtomatik istisna edir.
2. vercel.com → **Add New → Project** → GitHub repository-ni seçin.
3. **Framework Preset:** `Other`. **Build Command:** boş. **Output Directory:** `public`.
4. **Deploy** basmadan əvvəl **Environment Variables** bölməsini açın və bunları əlavə edin:

   | Name | Value | Qeyd |
   |---|---|---|
   | `DATABASE_URL` | Neon Pooled connection string | |
   | `SUPABASE_URL` | `https://XXXX.supabase.co` | |
   | `SUPABASE_ANON_KEY` | Supabase anon açarı | |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role açarı | **Sensitive** işarələyin |
   | `STORAGE_BUCKET` | `product-images` | |
   | `CATALOG_CACHE_SECONDS` | `30` | |

   `SOURCE_DATABASE_URL` Vercel-ə **əlavə etməyin** — o yalnız köçürmə üçündür.

5. **Deploy** basın. Bitdikdə Vercel bir ünvan verəcək (məs. `digibaku-v2.vercel.app`).
6. Yoxlayın: `https://SİZİN-ÜNVAN/api/health` → `{"ok":true}`.
7. `public/sitemap.xml` və `public/robots.txt` fayllarında `YOUR-DOMAIN` yazısını real ünvanla əvəz edin.

**Supabase tərəfində:** Authentication → URL Configuration bölməsində **Site URL** və **Redirect URLs** siyahısına Vercel ünvanınızı əlavə edin (məs. `https://digibaku-v2.vercel.app/login.html`). Bu olmasa, e-poçt linkləri işləməyəcək.

---

## 8. Yoxlama siyahısı

Bunları sırayla yoxlayın:

- [ ] `/api/health` → `{"ok":true}`
- [ ] Ana səhifə məhsulları göstərir, dil dəyişdirmə işləyir (AZ / RU / EN)
- [ ] `qiymetler.html`, `faq.html`, `product.html?product=netflix` açılır
- [ ] `login.html` → qeydiyyat (e-poçt linki gəlir), giriş, şifrə bərpası
- [ ] Giriş edildikdən sonra `profile.html` açılır, profil adı yadda qalır
- [ ] Məhsul səhifəsində sifariş → `profile.html`-də sifariş görünür
- [ ] `chat.html`-də mesaj göndərmək → admin panelin "Mesajlar" bölməsində görünür
- [ ] Admin panelində məhsul redaktəsi → saytda 30 saniyə ərzində dəyişir
- [ ] Mobil telefonda sayt və admin paneli düzgün görünür
- [ ] Köhnə saytın (`digibaku.com`) heç bir dəyişməyib

---

## 9. Təhlükəsizlik qaydaları

- `SUPABASE_SERVICE_ROLE_KEY` və `DATABASE_URL` yalnız serverdə və Vercel-in environment variables-ında olur. Brauzerə, GitHub-a və söhbətə yazmayın. Əgər bu açarlar bir yerdə paylaşılıbsa, Supabase-də **Reset** edin və Neon-da parolu dəyişin.
- Admin icazəsi serverdə yoxlanılır (`admin_users` cədvəli). Brauzerdəki kod icazəni təyin etmir.
- Admin sessiyası brauzer `localStorage`-ında saxlanılmır.
- Sifariş qiyməti serverdə yenidən hesablanır. Brauzerdən göndərilən qiymət qəbul olunmur.
- Qiyməti olmayan məhsul sifariş olunmur və saytda `0 AZN` göstərilmir.
- Yazma əməliyyatları yalnız serverdəki service-role ilə edilir. Neon-a birbaşa açıq yazma icazəsi yoxdur.

---

## 10. Məlum məhdudiyyətlər (hələ tamamlanmayanlar)

Bunları bilməyiniz vacibdir:

- **Səbət yoxdur:** müştəri hər dəfə bir məhsulu bir müddət üçün sifariş edir. Çoxməhsullu səbət əlavə olunacaq.
- **Ödəniş yoxdur:** sifariş "pending" statusunda yaradılır, ödəniş admin tərəfindən təsdiqlənir. Real ödəniş inteqrasiyası ayrıca iş tələb edir.
- **Admin paneldə SEO və menyu redaktoru yoxdur:** SEO məlumatları API-də və məhsul üzrə JSON sahəsində saxlanılır, amma panel formu hələ yoxdur.
- **Çat real-time deyil:** hər 10 saniyədən bir yenilənir. Supabase Realtime əlavə oluna bilər.
- **Müştəri rəy və çat sorğuları limitlənmir:** spam üçün rate limit əlavə edilməlidir.
- **Köhnə `customer_products` cədvəli** və `durations` sütunu köçürülmür.
- **Mən bu layihəni canlı Neon, Supabase və Vercel-də işə salıb yoxlaya bilmədim.** Sintaksis yoxlaması və pricing testləri keçib, lakin SQL sxemi, Supabase Auth axını və Vercel yönləndirməsi sizin tərəfinizdə yoxlanmalıdır. Hər hansı xəta olsa, Vercel-də **Functions → Logs** bölməsindəki mesajı mənə göndərin.

---

## Layihə strukturu

```
api/[...slug].js          Vercel giriş nöqtəsi (bütün /api/* sorğuları)
server/
  app.js                  Express tətbiqi və marşrutlar
  index.js                Yerli işə salma (npm run dev)
  auth.js                 Admin və müştəri icazəsi (serverdə)
  db/postgres.js          Neon/PostgreSQL qatı — yeganə DB kodu
  services/supabase.js    Supabase Auth və Storage
  services/pricing.js     Qiymət hesablaması (pure, testlənib)
  services/catalog.js     Sayt kataloqu
  routes/public.js        Açıq API (katalog, konfiqurasiya, rəy)
  routes/orders.js        Sifarişlər
  routes/me.js            Müştərinin profili və çatı
  routes/admin.js         Admin API
public/                   Sayt və admin paneli (statik)
sql/neon/                 Neon sxemi və isteğe bağlı başlanğıc kataloq
scripts/                  Admin təyin etmə və Supabase → Neon köçürmə
tests/                    Qiymət məntiqinin testləri
```

Bir DB-dən digərinə keçmək üçün yalnız `server/db/postgres.js` faylındakı eyni metodları yeni adapterdə yenidən yazmaq və `DATABASE_URL`-i dəyişmək kifayətdir.

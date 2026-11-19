# DigiBaku v3 — ilk versiya (test edilməyib)

## Nə daxildir
- Ana səhifə, Məhsullar (kateqoriyalar yazılı), Məhsul detalı, Səbət, Giriş/Qeydiyyat, FAQ, Sifarişlər, Profil
- Sabit aşağı naviqasiya (5 tab), sağda hamburger menyu, sabit Chat və WhatsApp düymələri
- API: /api/products, /api/faq, /api/orders (GET/POST)
- Qiymətlər YALNIZ serverdə bazadan hesablanır. Səbətdəki qiymətə etibar edilmir.
- Qiyməti 0 və ya olmayan müddət göstərilmir.
- Ödəniş yoxdur: sifariş "pending" statusunda yaranır.

## Hələ YOXDUR (düzgün olmadığı üçün əlavə etməmişəm)
- Admin paneli (gizli_panel) — növbəti mərhələ
- Chat (mesajlaşma) — indi yalnız WhatsApp yönləndirməsi var
- Hüquqi mətnlər (Haqqımızda, Məxfilik, Şərtlər, Qaydalar) — mətn təqdim edilməyib
- RU/EN tərcümələrinin tam dolması — UI əsas hissədə AZ, bəzi hissələr RU/EN
- Şəkillərin Supabase Storage-ə köçürülməsi — hazırda image_url (xarici URL)
- Rəy göndərmə və admin təsdiqi
- Ana səhifə bannerləri və rəylər admin üçün hələ bağlı deyil

## Vercel environment dəyişənləri
- DATABASE_URL  — Neon connection string (neondb)
- NEON_AUTH_URL — (istəyə bağlı) default olaraq artıq yazılıb

## Deploy
1. Zip-i açın, `digibaku-v3` qovluğunu GitHub repo-na yükləyin (köhnə fayllarla qarışdırmayın).
2. Vercel-də Environment Variables əlavə edin (yuxarıda).
3. Redeploy edin.

## Test siyahısı (mütləq, telefon və kompüter)
1. /api/products açılır və JSON qaytarır (Netflix, YouTube və s. görünür).
2. /api/faq açılır.
3. Ana səhifə: kateqoriyalar yüklənir və adları yazılıdır.
4. Məhsullar: kateqoriya filtri və axtarış işləyir.
5. Məhsul detalı: müddət seçimi qiyməti dəyişir, səbətə əlavə olunur.
6. Səbət: + / − / Sil, cəmi düzgündür, refresh-dən sonra qalır.
7. Qeydiyyat: login.html?mode=register — uğurlu olursa cavab, səbəb olmazsa Network cavabı.
8. Giriş və sessiya: yenilədikdən sonra header-də "Profilim" görünür. (Riskli: cookie domeni fərqli ola bilər.)
9. Sifariş: giriş edilmiş istifadəçi ilə checkout → orders.html-də görünür.
10. Mobil: aşağı menyu ekranı örtmür, hamburger sağdadır, WhatsApp düyməsi açılır.
11. Konsolda xəta (F12) olmamalıdır.

## Məlum risklər
- Sessiya cookie-si Neon Auth domenindən gəlir, API isə digibaku.com domenindədir. Brauzer cookie-ni API-yə göndərməyə bilər. Bu zaman sifariş 401 verəcək. Həll: Neon Auth panelində saytın domeni trusted origin kimi əlavə olunmalı və ya auth proxy qurulmalıdır. Bu, test zamanı ilk yoxlanmalı olan məqamdır.
- Sifarişlər yalnız sahib (neondb_owner) rolu ilə yazılır. RLS siyasətləri (orders, profiles üçün) hələ yazılmayıb, bu səbəbdən növbəti mərhələdə əlavə olunmalıdır.
- site_products.product_key ilə product_prices.product_key-in eyni dəyərləri daşıdığı fərz edilir.

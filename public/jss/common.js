
// Ortaq köməkçilər: dil, API, Supabase Auth (yalnız müştəri girişi), bildiriş, başlıq.
export const $ = (s, r = document) => r.querySelector(s);
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
export const money = (v) => `${Number(v || 0).toFixed(2)} AZN`;
export const LANGS = ['az', 'ru', 'en'];

const LANG_KEY = 'digibaku_lang';

export function getLang() {
  try {
    const l = localStorage.getItem(LANG_KEY);
    return LANGS.includes(l) ? l : 'az';
  } catch {
    return 'az';
  }
}

export function setLang(l) {
  const lang = LANGS.includes(l) ? l : 'az';
  try { localStorage.setItem(LANG_KEY, lang); } catch {}
}

const LOCALE = { az: 'az-AZ', ru: 'ru-RU', en: 'en-GB' };
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(LOCALE[getLang()]) : '—');
export const fmtTime = (d) => (d ? new Date(d).toLocaleString(LOCALE[getLang()], { dateStyle: 'short', timeStyle: 'short' }) : '');

export const T = {
  az: {
    products: 'Məhsullar', prices: 'Qiymətlər', faq: 'FAQ', chat: 'Çat', account: 'Hesab',
    login: 'Daxil ol', register: 'Qeydiyyat', reset: 'Şifrəni bərpa et', logout: 'Çıxış',
    email: 'E-poçt', password: 'Şifrə', newPassword: 'Yeni şifrə', fullName: 'Ad və soyad', name: 'Adınız',
    save: 'Yadda saxla', send: 'Göndər', sendReset: 'Bərpa linki göndər',
    loading: 'Yüklənir…', loadError: 'Məlumat yüklənə bilmədi.', notFound: 'Məhsul tapılmadı.', back: 'Ana səhifə',
    selectPlan: 'Müddət seçin', qty: 'Say', buy: 'Sifariş ver', contactPrice: 'Qiymət üçün bizimlə əlaqə saxlayın',
    askQuestion: 'Bu məhsul haqqında sual verin', orderOk: 'Sifariş yaradıldı',
    month: 'ay', year: 'il',
    profile: 'Profil', orders: 'Sifarişlərim', noOrders: 'Hələ sifarişiniz yoxdur.',
    reviewTitle: 'Rəy yazın', rating: 'Ulduz', reviewText: 'Rəyiniz',
    reviewOk: 'Rəyiniz göndərildi. Təsdiqdən sonra görünəcək.', profileSaved: 'Profil yadda saxlandı.',
    chatPlaceholder: 'Mesajınızı yazın…', chatEmpty: 'Hələ mesaj yoxdur. Sualınızı yazın.',
    invalidCreds: 'E-poçt və ya şifrə yanlışdır.',
    signupOk: 'Qeydiyyat tamamlandı. E-poçtunuza gələn linkə klik edib təsdiqləyin.',
    resetOk: 'Bərpa linki e-poçtunuza göndərildi.', passwordChanged: 'Şifrəniz dəyişdirildi.',
    status: { pending: 'Cavab gözləyir', confirmed: 'Təsdiqləndi', processing: 'Hazırlanır', completed: 'Hazırdır', cancelled: 'Ləğv edildi' },
    err: {
      generic: 'Xəta baş verdi. Yenidən cəhd edin.', unauthorized: 'Əvvəlcə daxil olun.',
      invalid_items: 'Sifariş məlumatı düzgün deyil.', product_unavailable: 'Bu məhsul hal-hazırda mövcud deyil.',
      price_unavailable: 'Bu müddət üçün qiymət yoxdur. Bizimlə əlaqə saxlayın.',
      invalid_review: 'Rəy ən azı 10 simvol olmalıdır.', invalid_message: 'Mesaj boş və ya çox uzundur.',
    },
  },
  ru: {
    products: 'Товары', prices: 'Цены', faq: 'FAQ', chat: 'Чат', account: 'Аккаунт',
    login: 'Войти', register: 'Регистрация', reset: 'Сброс пароля', logout: 'Выйти',
    email: 'Эл. почта', password: 'Пароль', newPassword: 'Новый пароль', fullName: 'Имя и фамилия', name: 'Ваше имя',
    save: 'Сохранить', send: 'Отправить', sendReset: 'Отправить ссылку',
    loading: 'Загрузка…', loadError: 'Не удалось загрузить данные.', notFound: 'Товар не найден.', back: 'Главная',
    selectPlan: 'Выберите срок', qty: 'Кол-во', buy: 'Заказать', contactPrice: 'Свяжитесь с нами для уточнения цены',
    askQuestion: 'Задать вопрос по этому товару', orderOk: 'Заказ создан',
    month: 'мес.', year: 'год',
    profile: 'Профиль', orders: 'Мои заказы', noOrders: 'Заказов пока нет.',
    reviewTitle: 'Оставить отзыв', rating: 'Оценка', reviewText: 'Ваш отзыв',
    reviewOk: 'Отзыв отправлен. Он появится после проверки.', profileSaved: 'Профиль сохранён.',
    chatPlaceholder: 'Напишите сообщение…', chatEmpty: 'Сообщений пока нет. Напишите ваш вопрос.',
    invalidCreds: 'Неверная почта или пароль.',
    signupOk: 'Регистрация завершена. Подтвердите почту по ссылке из письма.',
    resetOk: 'Ссылка для сброса отправлена на почту.', passwordChanged: 'Пароль изменён.',
    status: { pending: 'Ожидает ответа', confirmed: 'Подтверждён', processing: 'Готовится', completed: 'Готов', cancelled: 'Отменён' },
    err: {
      generic: 'Произошла ошибка. Попробуйте ещё раз.', unauthorized: 'Сначала войдите.',
      invalid_items: 'Некорректные данные заказа.', product_unavailable: 'Этот товар сейчас недоступен.',
      price_unavailable: 'Для этого срока нет цены. Свяжитесь с нами.',
      invalid_review: 'Отзыв должен содержать минимум 10 символов.', invalid_message: 'Сообщение пустое или слишком длинное.',
    },
  },
  en: {
    products: 'Products', prices: 'Prices', faq: 'FAQ', chat: 'Chat', account: 'Account',
    login: 'Log in', register: 'Register', reset: 'Reset password', logout: 'Log out',
    email: 'Email', password: 'Password', newPassword: 'New password', fullName: 'Full name', name: 'Your name',
    save: 'Save', send: 'Send', sendReset: 'Send reset link',
    loading: 'Loading…', loadError: 'Could not load data.', notFound: 'Product not found.', back: 'Home',
    selectPlan: 'Choose a term', qty: 'Quantity', buy: 'Order', contactPrice: 'Contact us for pricing',
    askQuestion: 'Ask a question about this product', orderOk: 'Order created',
    month: 'mo', year: 'yr',
    profile: 'Profile', orders: 'My orders', noOrders: 'You have no orders yet.',
    reviewTitle: 'Leave a review', rating: 'Rating', reviewText: 'Your review',
    reviewOk: 'Review sent. It will appear after approval.', profileSaved: 'Profile saved.',
    chatPlaceholder: 'Type your message…', chatEmpty: 'No messages yet. Write your question.',
    invalidCreds: 'Wrong email or password.',
    signupOk: 'Registration complete. Open the link we sent to your email to confirm.',
    resetOk: 'Reset link sent to your email.', passwordChanged: 'Password changed.',
    status: { pending: 'Awaiting reply', confirmed: 'Confirmed', processing: 'Processing', completed: 'Ready', cancelled: 'Cancelled' },
    err: {
      generic: 'Something went wrong. Please try again.', unauthorized: 'Please log in first.',
      invalid_items: 'Invalid order data.', product_unavailable: 'This product is not available right now.',
      price_unavailable: 'No price for this term. Please contact us.',
      invalid_review: 'Review must be at least 10 characters.', invalid_message: 'Message is empty or too long.',
    },
  },
};

export const t = (k) => T[getLang()][k] ?? T.az[k] ?? k;
export const errMsg = (e) => T[getLang()].err[e?.code] || T[getLang()].err.generic;
export const monthsLabel = (m) => (Number(m) === 12 ? `1 ${t('year')}` : `${m} ${t('month')}`);

/* Bildiriş: səhifədə #toast yoxdursa özü yaradır */
export function toast(msg, ok = true) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.style.cssText = 'position:fixed;bottom:88px;left:50%;transform:translateX(-50%);max-width:calc(100% - 32px);background:#0f1626;color:#f5f7fb;border:1px solid #1b2540;border-radius:12px;padding:11px 16px;z-index:200;opacity:0;transition:opacity .2s;pointer-events:none';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.borderColor = ok ? '#2b5a40' : '#5a2b2b';
  el.style.opacity = '1';
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { el.style.opacity = '0'; }, 3200);
}

/* Serverə sorğu. token verilirsə Authorization başlığı göndərilir. */
export async function api(path, { method = 'GET', json, token } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (json !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: json !== undefined ? JSON.stringify(json) : undefined,
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const e = new Error(data?.error || 'error');
    e.code = data?.error;
    e.status = res.status;
    throw e;
  }
  return data;
}

export const catalog = () => api(`/public/catalog?lang=${getLang()}`);

/* Supabase Auth — yalnız müştəri girişi üçün. Admin paneli bunu istifadə etmir. */
let sbPromise;
export function sb() {
  sbPromise ??= api('/public/config').then(async (cfg) => {
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) throw new Error('Auth konfiqurasiya olunmayıb');
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.0/+esm');
    return createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  });
  sbPromise.catch(() => { sbPromise = undefined; });
  return sbPromise;
}

export async function token() {
  try {
    const { data } = await (await sb()).auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

/* Yönləndirmədə yalnız təhlükəsiz daxili səhifə adlarına icazə verilir (open redirect-in qarşısı) */
export const safeNext = (v) => (/^[a-z0-9_-]+\.html(\?[^\s]*)?$/i.test(v || '') ? v : 'profile.html');

/* Səhifə başlığı (pages üçün). Ana səhifə öz başlığını index.html-də idarə edir. */
export async function mountHeader() {
  const top = $('#top');
  if (!top) return;
  const lang = getLang();
  const L = T[lang];
  top.innerHTML = `
    <a class="brand" href="index.html"><span class="brand-mark">D</span><span class="brand-name">DigiBaku</span></a>
    <nav class="nav"><a href="index.html#products">${esc(L.products)}</a><a href="qiymetler.html">${esc(L.prices)}</a><a href="faq.html">${esc(L.faq)}</a></nav>
    <div class="top-actions">
      <div class="langs">${LANGS.map((l) => `<button data-lang="${l}" class="${l === lang ? 'on' : ''}">${l.toUpperCase()}</button>`).join('')}</div>
      <a class="chip" href="chat.html">${esc(L.chat)}</a>
      <a class="chip chip-solid" id="acc" href="login.html">${esc(L.account)}</a>
    </div>`;
  top.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => {
    setLang(b.dataset.lang);
    location.reload();
  }));
  if (await token()) $('#acc').href = 'profile.html';
}

import { $, money, getLang, setLang, api, token, sb, toast, errMsg, monthsLabel } from './common.js';

const UI = {
  az: { home:'Ana səhifə', products:'Məhsullar', cart:'Səbət', total:'Ümumi', checkout:'Sifarişi təsdiq et',
        empty:'Səbətiniz boşdur', add:'Səbətə at', details:'Ətraflı', all:'Hamısı', reviews:'Müştəri rəyləri',
        faq:'Tez-tez verilən suallar', noProducts:'Hazırda aktiv məhsul yoxdur.', noResults:'Axtarışa uyğun məhsul tapılmadı.',
        loading:'Yüklənir…', loadError:'Məlumat yüklənə bilmədi. Səhifəni yeniləyin.', login:'Daxil ol', profile:'Profil',
        loginNeeded:'Sifariş üçün daxil olun.', added:'Səbətə əlavə olundu', ordered:'Sifariş yaradıldı', remove:'Sil',
        info:'Məlumat', contact:'Əlaqə', noText:'Məlumat hələ əlavə edilməyib.', noPrice:'Qiymət üçün bizimlə əlaqə saxlayın',
        searchPh:'Məhsul axtar…', heroTitle:'Premium rəqəmsal xidmətlər',
        heroSub:'Netflix, YouTube Premium, ChatGPT və digər abunəliklər bir platformada.', heroCta:'Məhsullara bax',
        cartFull:'Səbət doludur.', note:'Qiymət sifariş zamanı serverdə yenidən hesablanır.',
        about:'Haqqımızda', terms:'Şərtlər və qaydalar', privacy:'Məxfilik siyasəti', prices:'Qiymətlər', chat:'Canlı çat',
        wa:'WhatsApp ilə yazın', footText:'Premium rəqəmsal xidmətlər bir platformada.', catTitle:'Nə axtarırsan?' },
  ru: { home:'Главная', products:'Товары', cart:'Корзина', total:'Итого', checkout:'Подтвердить заказ',
        empty:'Корзина пуста', add:'В корзину', details:'Подробнее', all:'Все', reviews:'Отзывы клиентов',
        faq:'Частые вопросы', noProducts:'Сейчас нет активных товаров.', noResults:'По запросу ничего не найдено.',
        loading:'Загрузка…', loadError:'Не удалось загрузить данные. Обновите страницу.', login:'Войти', profile:'Профиль',
        loginNeeded:'Войдите, чтобы оформить заказ.', added:'Добавлено в корзину', ordered:'Заказ создан', remove:'Удалить',
        info:'Информация', contact:'Контакты', noText:'Информация пока не добавлена.', noPrice:'Свяжитесь с нами для уточнения цены',
        searchPh:'Поиск товаров…', heroTitle:'Премиальные цифровые услуги',
        heroSub:'Netflix, YouTube Premium, ChatGPT и другие подписки на одной платформе.', heroCta:'Смотреть товары',
        cartFull:'Корзина заполнена.', note:'Цена пересчитывается на сервере при оформлении.',
        about:'О нас', terms:'Условия и правила', privacy:'Политика конфиденциальности', prices:'Цены', chat:'Онлайн-чат',
        wa:'Написать в WhatsApp', footText:'Премиальные цифровые услуги на одной платформе.', catTitle:'Что ищете?' },
  en: { home:'Home', products:'Products', cart:'Cart', total:'Total', checkout:'Confirm order',
        empty:'Your cart is empty', add:'Add to cart', details:'Details', all:'All', reviews:'Customer reviews',
        faq:'Frequently asked questions', noProducts:'No active products right now.', noResults:'No products match your search.',
        loading:'Loading…', loadError:'Could not load data. Please refresh the page.', login:'Log in', profile:'Profile',
        loginNeeded:'Log in to place an order.', added:'Added to cart', ordered:'Order created', remove:'Remove',
        info:'Information', contact:'Contact', noText:'No information has been added yet.', noPrice:'Contact us for pricing',
        searchPh:'Search products…', heroTitle:'Premium digital services',
        heroSub:'Netflix, YouTube Premium, ChatGPT and other subscriptions in one place.', heroCta:'View products',
        cartFull:'Your cart is full.', note:'Price is recalculated on the server at checkout.',
        about:'About us', terms:'Terms and conditions', privacy:'Privacy policy', prices:'Prices', chat:'Live chat',
        wa:'Chat on WhatsApp', footText:'Premium digital services on one platform.', catTitle:'What are you looking for?' },
};

const L = () => UI[getLang()] || UI.az;
const CART_KEY = 'digi_cart_v3';
const MAX_ITEMS = 20;
const MONTHS = [1, 2, 3, 6, 12];

let CATALOG = null;
let lastJson = '';
let activeCat = '';
let query = '';
let slideIndex = 0;
let slideTimer = null;
let cart = loadCart();
const picked = new Map();

/* ---------- köməkçilər ---------- */

function h(tag, props, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

const setText = (sel, text) => {
  const el = $(sel);
  if (el) el.textContent = text ?? '';
};

const safeUrl = (u) => (/^(https?:\/\/|\/)/.test(u || '') ? u : '');
const initial = (name) => (name || '?').trim().charAt(0).toUpperCase();

function loadCart() {
  try {
    const v = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    if (!Array.isArray(v)) return [];
    return v
      .filter((i) => i && typeof i.key === 'string' && MONTHS.includes(i.months) && i.quantity >= 1 && i.quantity <= 10)
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

function saveCart() {
  try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch {}
}

/* ---------- yükləmə və render ---------- */

async function load(force = false) {
  try {
    const data = await api(`/public/catalog?lang=${getLang()}`);
    const json = JSON.stringify(data);
    if (!force && json === lastJson) return;
    lastJson = json;
    CATALOG = data;
    if (activeCat && !(CATALOG.categories || []).some((c) => c.key === activeCat)) activeCat = '';
    renderAll();
  } catch (e) {
    console.error('Katalog yüklənmədi:', e);
    if (!CATALOG) $('#productGrid').replaceChildren(h('p', { class: 'muted', text: L().loadError }));
  }
}

function renderAll() {
  applyStatic();
  renderSlides();
  renderCats();
  renderProducts();
  renderReviews();
  renderFaq();
  renderFooter();
  renderCart();
  updateCount();
}

function applyStatic() {
  const d = L();
  setText('#catTitle', d.catTitle);
  setText('#prodTitle', d.products);
  setText('#revTitle', d.reviews);
  setText('#faqTitle', d.faq);
  setText('#cartTitle', d.cart);
  setText('#cartTotalLabel', d.total);
  setText('#checkoutBtn', d.checkout);
  setText('#cartNote', d.note);
  setText('#bnHomeT', d.home);
  setText('#bnProductsT', d.products);
  setText('#bnCartT', d.cart);
  setText('#bnProfileT', d.profile);
  setText('#footInfoTitle', d.info);
  setText('#footContactTitle', d.contact);
  setText('#linkAbout', d.about);
  setText('#linkTerms', d.terms);
  setText('#linkPrivacy', d.privacy);
  setText('#linkPrices', d.prices);
  setText('#footChat', d.chat);
  setText('#pageClose', '✕');
  const search = $('#search');
  if (search) search.placeholder = d.searchPh;
  const wa = $('#footWa');
  if (wa) wa.textContent = d.wa;
}

function markLang() {
  const lang = getLang();
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-lang]').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
  });
}

/* ---------- banner slayd ---------- */

function slidesData() {
  const d = L();
  const c = CATALOG?.content || {};
  const banners = (CATALOG?.banners || []).filter((b) => b.title || b.image_url);
  if (banners.length) {
    return banners.map((b) => ({
      title: b.title, sub: b.subtitle, img: safeUrl(b.image_url), cta: b.cta_label, url: safeUrl(b.cta_url) || '#products',
    }));
  }
  return [{ title: c.hero_title || d.heroTitle, sub: c.hero_subtitle || d.heroSub, img: '', cta: c.hero_cta || d.heroCta, url: '#products' }];
}

function renderSlides() {
  const slides = slidesData();
  slideIndex = Math.min(slideIndex, slides.length - 1);
  const s = slides[slideIndex];
  $('#slide').replaceChildren(
    s.img ? h('img', { src: s.img, alt: '', class: 'slide-img' }) : null,
    h('div', { class: 'slide-text' },
      h('h1', { text: s.title || '' }),
      s.sub ? h('p', { text: s.sub }) : null,
      h('a', { class: 'btn btn-primary', href: s.url, text: s.cta || L().heroCta })),
  );
  const dots = $('#dots');
  dots.hidden = slides.length < 2;
  dots.replaceChildren(...slides.map((_, i) => h('button', {
    type: 'button',
    class: i === slideIndex ? 'dot on' : 'dot',
    'aria-label': `${i + 1}`,
    onclick: () => { slideIndex = i; renderSlides(); restartSlides(); },
  })));
}

function restartSlides() {
  clearInterval(slideTimer);
  const n = slidesData().length;
  if (n > 1) {
    slideTimer = setInterval(() => {
      slideIndex = (slideIndex + 1) % n;
      renderSlides();
    }, 6000);
  }
}

/* ---------- kateqoriyalar ---------- */

function renderCats() {
  const d = L();
  const cats = CATALOG.categories || [];
  const counts = {};
  (CATALOG.products || []).forEach((p) => {
    if (p.category) counts[p.category] = (counts[p.category] || 0) + 1;
  });

  $('#catNav').replaceChildren(...[{ key: '', name: d.all }, ...cats].map((c) => h('button', {
    class: 'cat-chip',
    type: 'button',
    'aria-pressed': String(activeCat === c.key),
    onclick: () => setCat(c.key),
    text: c.name,
  })));

  $('#catGrid').replaceChildren(...cats.map((c) => h('button', {
    class: 'cat-tile',
    type: 'button',
    'aria-pressed': String(activeCat === c.key),
    onclick: () => {
      setCat(c.key);
      $('#products').scrollIntoView({ behavior: 'smooth' });
    },
  },
    h('span', { class: 'ico', text: c.icon || '' }),
    h('span', { class: 'n', text: c.name }),
    h('span', { class: 'c', text: `${counts[c.key] || 0} ${d.products.toLowerCase()}` }),
  )));
}

function setCat(key) {
  activeCat = key;
  renderCats();
  renderProducts();
}

/* ---------- məhsullar ---------- */

function renderProducts() {
  if (!CATALOG) return;
  const d = L();
  const all = CATALOG.products || [];
  const grid = $('#productGrid');

  if (!all.length) {
    setText('#prodCount', '');
    grid.replaceChildren(h('div', { class: 'empty', text: d.noProducts }));
    return;
  }

  const q = query.toLowerCase();
  const list = all.filter((p) =>
    (!activeCat || p.category === activeCat) && (!q || (p.name || '').toLowerCase().includes(q)));

  setText('#prodCount', list.length ? String(list.length) : '');
  grid.replaceChildren(...(list.length ? list.map(productCard) : [h('div', { class: 'empty', text: d.noResults })]));
}

function productCard(p) {
  const d = L();
  const plans = (p.prices || []).filter((x) => MONTHS.includes(x.months) && x.current_price > 0);
  const img = safeUrl(p.image_url);
  const catName = (CATALOG.categories || []).find((c) => c.key === p.category)?.name;

  let sel = picked.get(p.key);
  if (!plans.some((x) => x.months === sel)) sel = plans[0]?.months;
  picked.set(p.key, sel);
  const cur = plans.find((x) => x.months === sel);

  const chips = plans.length > 1
    ? h('div', { class: 'chips' }, ...plans.map((x) => h('button', {
        type: 'button',
        class: x.months === sel ? 'chip on' : 'chip',
        onclick: () => { picked.set(p.key, x.months); renderProducts(); },
      }, monthsLabel(x.months))))
    : null;

  const price = cur
    ? h('div', { class: 'p-price' },
        cur.sale_price ? h('s', { text: money(cur.price) }) : null,
        h('b', { text: money(cur.current_price) }))
    : h('div', { class: 'p-nop', text: d.noPrice });

  const actions = cur
    ? h('div', { class: 'p-actions' },
        h('button', { class: 'btn btn-primary btn-block', type: 'button', text: d.add, onclick: () => addItem(p, sel) }),
        h('a', { class: 'btn btn-ghost btn-block', href: `product.html?product=${encodeURIComponent(p.key)}`, text: d.details }))
    : null;

  return h('article', { class: 'p-card' },
    h('div', { class: 'p-img' }, img
      ? h('img', {
          src: img,
          alt: p.name || '',
          loading: 'lazy',
          onerror: (e) => e.currentTarget.replaceWith(h('span', { class: 'mono', text: initial(p.name) })),
        })
      : h('span', { class: 'mono', text: initial(p.name) })),
    catName ? h('span', { class: 'p-cat', text: catName }) : null,
    h('h3', { class: 'p-name', text: p.name || '' }),
    chips,
    price,
    actions,
  );
}

/* ---------- səbət ---------- */

function addItem(p, months) {
  const d = L();
  const opt = (p.prices || []).find((x) => x.months === months);
  if (!opt) return;

  const found = cart.find((i) => i.key === p.key && i.months === months);
  if (found) {
    found.quantity = Math.min(10, found.quantity + 1);
  } else {
    if (cart.length >= MAX_ITEMS) return toast(d.cartFull, false);
    cart.push({ key: p.key, name: p.name, months, quantity: 1, price: opt.current_price });
  }
  afterCartChange();
  toast(d.added);
}

function changeQty(idx, delta) {
  const it = cart[idx];
  if (!it) return;
  it.quantity = Math.min(10, Math.max(1, it.quantity + delta));
  afterCartChange();
}

function removeItem(idx) {
  cart.splice(idx, 1);
  afterCartChange();
}

function afterCartChange() {
  saveCart();
  renderCart();
  updateCount();
}

function renderCart() {
  const d = L();
  const items = cart.length
    ? cart.map((i, idx) => h('div', { class: 'cart-item' },
        h('div', { class: 'ci-info' },
          h('div', { class: 'nm', text: i.name }),
          h('div', { class: 'pr', text: `${monthsLabel(i.months)} · ${money(i.price * i.quantity)}` })),
        h('div', { class: 'qty' },
          h('button', { type: 'button', 'aria-label': '−', onclick: () => changeQty(idx, -1), text: '−' }),
          h('span', { text: String(i.quantity) }),
          h('button', { type: 'button', 'aria-label': '+', onclick: () => changeQty(idx, 1), text: '+' })),
        h('button', { class: 'ci-del', type: 'button', 'aria-label': d.remove, onclick: () => removeItem(idx), text: '✕' })))
    : [h('p', { class: 'muted', text: d.empty })];

  $('#cartList').replaceChildren(...items);
  setText('#cartTotal', money(cart.reduce((s, i) => s + i.price * i.quantity, 0)));
}

function updateCount() {
  const n = String(cart.reduce((s, i) => s + i.quantity, 0));
  setText('#cartCount', n);
  setText('#bnCount', n);
}

function openCart(open) {
  document.body.classList.toggle('cart-open', open);
  if (open) $('#scrim').hidden = false;
  else if (!$('#pageDrawer').hidden === false) $('#scrim').hidden = true;
}

async function checkout() {
  const d = L();
  if (!cart.length) return toast(d.empty, false);

  const tk = await token();
  if (!tk) {
    toast(d.loginNeeded, false);
    setTimeout(() => { location.href = 'login.html?next=index.html'; }, 900);
    return;
  }

  try {
    const order = await api('/orders', {
      method: 'POST',
      token: tk,
      json: {
        lang: getLang(),
        items: cart.map((i) => ({ product_key: i.key, months: i.months, quantity: i.quantity })),
      },
    });
    cart = [];
    afterCartChange();
    closeAll();
    toast(`${d.ordered} · ${money(order.total)}`);
    setTimeout(() => { location.href = 'profile.html'; }, 1200);
  } catch (e) {
    toast(errMsg(e), false);
  }
}

/* ---------- məlumat səhifələri (Haqqımızda, Şərtlər, Məxfilik) ---------- */

function showPage(key) {
  const d = L();
  const titles = { about_text: d.about, terms_text: d.terms, privacy_text: d.privacy };
  const text = (CATALOG?.content || {})[key] || '';
  setText('#pageTitle', titles[key] || d.info);
  $('#pageBody').replaceChildren(h('p', { text: text || d.noText }));
  $('#pageDrawer').hidden = false;
  $('#scrim').hidden = false;
}

function closeAll() {
  document.body.classList.remove('cart-open');
  $('#pageDrawer').hidden = true;
  $('#scrim').hidden = true;
}

/* ---------- rəylər, FAQ, footer ---------- */

function renderReviews() {
  const list = CATALOG.reviews || [];
  $('#reviews').hidden = list.length === 0;
  $('#reviewGrid').replaceChildren(...list.map((r) => {
    const n = Math.max(0, Math.min(5, Number(r.rating) || 0));
    return h('article', { class: 'review' },
      h('div', { class: 'stars', text: '★'.repeat(n) + '☆'.repeat(5 - n) }),
      h('p', { text: r.text || '' }),
      h('div', { class: 'who', text: r.author || '' }));
  }));
}

function renderFaq() {
  const list = (CATALOG.faqs || []).filter((f) => !f.product_key);
  $('#faq').hidden = list.length === 0;
  $('#faqList').replaceChildren(...list.map((f) => h('details', null,
    h('summary', { text: f.question || '' }),
    h('p', { text: f.answer || '' }))));
}

function renderFooter() {
  const s = CATALOG.settings || {};
  const c = CATALOG.content || {};
  setText('#footText', c.footer_text || L().footText);
  setText('#footEmail', s.email || '');
  setText('#footPhone', s.phone || '');
  setText('#footAddress', s.address || '');
  setText('#year', String(new Date().getFullYear()));

  const digits = String(s.whatsapp || '').replace(/\D/g, '');
  const link = digits ? `https://wa.me/${digits}` : '';
  for (const sel of ['#waFloat', '#footWa']) {
    const el = $(sel);
    if (!el) continue;
    el.hidden = !digits;
    if (digits) el.href = link;
  }
}

/* ---------- hesab ---------- */

async function setupAuth() {
  const d = L();
  const logged = !!(await token());
  const acc = $('#accountBtn');
  if (acc) {
    acc.textContent = logged ? d.profile : d.login;
    acc.href = logged ? 'profile.html' : 'login.html';
  }
  const bp = $('#bnProfile');
  if (bp) bp.href = logged ? 'profile.html' : 'login.html';
  setText('#bnProfileT', logged ? d.profile : d.login);
}

/* ---------- hadisələr ---------- */

$('#searchForm').addEventListener('submit', (e) => e.preventDefault());
$('#search').addEventListener('input', (e) => {
  query = e.target.value.trim();
  renderProducts();
});

document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => {
  setLang(b.dataset.lang);
  markLang();
  applyStatic();
  load(true);
  setupAuth();
}));

$('#bnCart').addEventListener('click', () => openCart(true));
$('#cartClose').addEventListener('click', closeAll);
$('#checkoutBtn').addEventListener('click', checkout);
$('#pageClose').addEventListener('click', closeAll);
$('#scrim').addEventListener('click', closeAll);
document.querySelectorAll('[data-page]').forEach((b) => b.addEventListener('click', () => showPage(b.dataset.page)));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(); });

/* ---------- başlanğıc ---------- */

function init() {
  markLang();
  applyStatic();
  $('#productGrid').replaceChildren(h('p', { class: 'muted', text: L().loading }));
  renderCart();
  updateCount();
  load(true);
  setupAuth();
  restartSlides();
  sb().then((client) => client.auth.onAuthStateChange(() => setupAuth())).catch(() => {});

  setInterval(() => {
    if (document.visibilityState === 'visible') load(false);
  }, 60000);
}

init();

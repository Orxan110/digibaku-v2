import { $, money, getLang, setLang, api, token, sb, toast, errMsg, monthsLabel } from './common.js';

const UI = {
  az: { cart:'Səbət', total:'Ümumi', checkout:'Sifarişi təsdiq et', cartEmpty:'Səbətiniz boşdur', add:'Səbətə at',
        order:'Sifariş et', details:'Ətraflı', noPrice:'Qiymət üçün bizimlə əlaqə saxlayın', all:'Hamısı',
        products:'Məhsullar', categories:'Kateqoriyalar', reviews:'Müştəri rəyləri', faq:'Tez-tez verilən suallar',
        noResults:'Axtarışa uyğun məhsul tapılmadı.', noProducts:'Hazırda aktiv məhsul yoxdur.', loading:'Yüklənir…',
        loadError:'Məlumat yüklənə bilmədi. Səhifəni yeniləyin.', login:'Daxil ol', profile:'Profil',
        loginNeeded:'Sifariş üçün daxil olun.', added:'Səbətə əlavə olundu', ordered:'Sifariş yaradıldı',
        qty:'Say', remove:'Sil', links:'Keçidlər', contact:'Əlaqə', prices:'Qiymətlər', chat:'Çat', account:'Hesab',
        heroTitle:'Premium rəqəmsal xidmətlər', heroSub:'Netflix, YouTube Premium, ChatGPT və digər abunəliklər bir platformada.',
        heroCta:'Məhsullara bax', searchPh:'Məhsul axtar…', footText:'Premium rəqəmsal xidmətlər bir platformada.',
        priceNote:'Qiymət sifariş zamanı serverdə yenidən hesablanır.', selectPlan:'Müddət', cartFull:'Səbət doludur.' },
  ru: { cart:'Корзина', total:'Итого', checkout:'Подтвердить заказ', cartEmpty:'Корзина пуста', add:'В корзину',
        order:'Заказать', details:'Подробнее', noPrice:'Свяжитесь с нами для уточнения цены', all:'Все',
        products:'Товары', categories:'Категории', reviews:'Отзывы клиентов', faq:'Частые вопросы',
        noResults:'По запросу ничего не найдено.', noProducts:'Сейчас нет активных товаров.', loading:'Загрузка…',
        loadError:'Не удалось загрузить данные. Обновите страницу.', login:'Войти', profile:'Профиль',
        loginNeeded:'Войдите, чтобы оформить заказ.', added:'Добавлено в корзину', ordered:'Заказ создан',
        qty:'Кол-во', remove:'Удалить', links:'Ссылки', contact:'Контакты', prices:'Цены', chat:'Чат', account:'Аккаунт',
        heroTitle:'Премиальные цифровые услуги', heroSub:'Netflix, YouTube Premium, ChatGPT и другие подписки на одной платформе.',
        heroCta:'Смотреть товары', searchPh:'Поиск товаров…', footText:'Премиальные цифровые услуги на одной платформе.',
        priceNote:'Цена пересчитывается на сервере при оформлении.', selectPlan:'Срок', cartFull:'Корзина заполнена.' },
  en: { cart:'Cart', total:'Total', checkout:'Confirm order', cartEmpty:'Your cart is empty', add:'Add to cart',
        order:'Order', details:'Details', noPrice:'Contact us for pricing', all:'All',
        products:'Products', categories:'Categories', reviews:'Customer reviews', faq:'Frequently asked questions',
        noResults:'No products match your search.', noProducts:'No active products right now.', loading:'Loading…',
        loadError:'Could not load data. Please refresh the page.', login:'Log in', profile:'Profile',
        loginNeeded:'Log in to place an order.', added:'Added to cart', ordered:'Order created',
        qty:'Qty', remove:'Remove', links:'Links', contact:'Contact', prices:'Prices', chat:'Chat', account:'Account',
        heroTitle:'Premium digital services', heroSub:'Netflix, YouTube Premium, ChatGPT and other subscriptions in one place.',
        heroCta:'View products', searchPh:'Search products…', footText:'Premium digital services on one platform.',
        priceNote:'Price is recalculated on the server at checkout.', selectPlan:'Term', cartFull:'Your cart is full.' },
};

const L = () => UI[getLang()] || UI.az;
const CART_KEY = 'digi_cart_v2';
const MAX_ITEMS = 20;
const ALLOWED_MONTHS = [1, 2, 3, 6, 12];

let CATALOG = null;
let activeCat = '';
let query = '';
let lastJson = '';
let cart = loadCart();

/* ---------- köməkçilər ---------- */

// DOM yaradır. Bütün mətnlər textContent ilə yazılır, buna görə HTML inyeksiyası mümkün deyil.
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

// Yalnız təhlükəsiz URL-lər (javascript: və s. rədd olunur)
const safeUrl = (u) => (/^(https?:\/\/|\/)/.test(u || '') ? u : '');
const initial = (name) => (name || '?').trim().charAt(0).toUpperCase();

function loadCart() {
  try {
    const v = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    if (!Array.isArray(v)) return [];
    return v
      .filter((i) => i && typeof i.key === 'string' && ALLOWED_MONTHS.includes(i.months) && i.quantity >= 1)
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

function saveCart() {
  try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch {}
}

/* ---------- yükləmə ---------- */

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
    if (!CATALOG) $('#productBox').replaceChildren(h('p', { class: 'muted', text: L().loadError }));
  }
}

function renderAll() {
  applyStatic();
  renderHero();
  renderCats();
  renderProducts();
  renderReviews();
  renderFaq();
  renderFooter();
  renderCart();
  updateCartCount();
}

/* ---------- statik mətnlər və dil ---------- */

function applyStatic() {
  const d = L();
  const cartLabel = Array.from($('#cartBtn')?.childNodes || []).find((n) => n.nodeType === Node.TEXT_NODE);
  if (cartLabel) cartLabel.nodeValue = `${d.cart} `;

  const search = $('#search');
  if (search) search.placeholder = d.searchPh;
  setText('#catTitle', d.categories);
  setText('#prodTitle', d.products);
  setText('#revTitle', d.reviews);
  setText('#faqTitle', d.faq);
  setText('#cartTitle', d.cart);
  setText('#cartTotalLabel', d.total);
  setText('#checkoutBtn', d.checkout);
  setText('#cartNote', d.priceNote);
  setText('#footLinksTitle', d.links);
  setText('#footPrices', d.prices);
  setText('#footChat', d.chat);
  setText('#footContactTitle', d.contact);
}

function markLang() {
  const lang = getLang();
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-lang]').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
  });
}

/* ---------- hero və bannerlər ---------- */

function renderHero() {
  const c = CATALOG.content || {};
  const d = L();
  setText('#heroTitle', c.hero_title || d.heroTitle);
  setText('#heroSub', c.hero_subtitle || d.heroSub);
  setText('#heroCta', c.hero_cta || d.heroCta);

  const banners = CATALOG.banners || [];
  const img = $('#heroImg');
  const src = safeUrl(banners[0]?.image_url);
  if (img) {
    img.hidden = !src;
    if (src) {
      img.src = src;
      img.alt = banners[0].title || '';
    }
  }

  const promos = $('#promos');
  if (promos) {
    const rest = banners.slice(1, 3);
    promos.replaceChildren(...rest.map((b) => h('a', { class: 'promo card', href: safeUrl(b.cta_url) || '#products' },
      b.cta_label ? h('span', { class: 'tag', text: b.cta_label }) : null,
      h('h3', { text: b.title || '' }),
      b.subtitle ? h('p', { text: b.subtitle }) : null,
    )));
    promos.hidden = rest.length === 0;
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
    class: 'cat-card',
    type: 'button',
    onclick: () => {
      setCat(c.key);
      $('#products')?.scrollIntoView({ behavior: 'smooth' });
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

function matchesQuery(p) {
  const q = query.toLowerCase();
  return (p.name || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
}

function renderProducts() {
  const d = L();
  const box = $('#productBox');
  const all = CATALOG.products || [];

  if (!all.length) {
    setText('#prodCount', '');
    box.replaceChildren(h('div', { class: 'empty', text: d.noProducts }));
    return;
  }

  const list = all.filter((p) => (!activeCat || p.category === activeCat) && (!query || matchesQuery(p)));
  setText('#prodCount', list.length ? String(list.length) : '');

  if (!list.length) {
    box.replaceChildren(h('div', { class: 'empty', text: d.noResults }));
    return;
  }
  box.replaceChildren(h('div', { class:

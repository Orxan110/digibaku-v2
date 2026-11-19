import { $, money, getLang, setLang, api, token, sb, toast, errMsg, monthsLabel } from './common.js';

const UI = {
  az: { cart:'Səbət', total:'Ümumi', checkout:'Sifarişi təsdiq et', cartEmpty:'Səbətiniz boşdur', add:'Səbətə at',
        order:'Sifariş et', details:'Ətraflı', noPrice:'Qiymət üçün bizimlə əlaqə saxlayın', all:'Hamısı',
        products:'Məhsullar', categories:'Kateqoriyalar', reviews:'Müştəri rəyləri', faq:'Tez-tez verilən suallar',
        noResults:'Axtarışa uyğun məhsul tapılmadı.', noProducts:'Hazırda aktiv məhsul yoxdur.', loading:'Yüklənir…',
        loadError:'Məlumat yüklənə bilmədi.', login:'Daxil ol', profile:'Profil', loginNeeded:'Sifariş üçün daxil olun.',
        added:'Səbətə əlavə olundu', ordered:'Sifariş yaradıldı', qty:'Say', remove:'Sil', links:'Keçidlər',
        contact:'Əlaqə', heroTitle:'Premium rəqəmsal xidmətlər', heroSub:'Netflix, YouTube Premium, ChatGPT və digər abunəliklər bir platformada.',
        heroCta:'Məhsullara bax', searchPh:'Məhsul axtar…', footText:'Premium rəqəmsal xidmətlər bir platformada.',
        prices:'Qiymətlər', chat:'Çat', account:'Hesab', priceNote:'Qiymət sifariş zamanı serverdə yenidən hesablanır.',
        selectPlan:'Müddət' },
  ru: { cart:'Корзина', total:'Итого', checkout:'Подтвердить заказ', cartEmpty:'Корзина пуста', add:'В корзину',
        order:'Заказать', details:'Подробнее', noPrice:'Свяжитесь с нами для уточнения цены', all:'Все',
        products:'Товары', categories:'Категории', reviews:'Отзывы клиентов', faq:'Частые вопросы',
        noResults:'По запросу ничего не найдено.', noProducts:'Сейчас нет активных товаров.', loading:'Загрузка…',
        loadError:'Не удалось загрузить данные.', login:'Войти', profile:'Профиль', loginNeeded:'Войдите, чтобы оформить заказ.',
        added:'Добавлено в корзину', ordered:'Заказ создан', qty:'Кол-во', remove:'Удалить', links:'Ссылки',
        contact:'Контакты', heroTitle:'Премиальные цифровые услуги', heroSub:'Netflix, YouTube Premium, ChatGPT и другие подписки на одной платформе.',
        heroCta:'Смотреть товары', searchPh:'Поиск товаров…', footText:'Премиальные цифровые услуги на одной платформе.',
        prices:'Цены', chat:'Чат', account:'Аккаунт', priceNote:'Цена пересчитывается на сервере при оформлении.',
        selectPlan:'Срок' },
  en: { cart:'Cart', total:'Total', checkout:'Confirm order', cartEmpty:'Your cart is empty', add:'Add to cart',
        order:'Order', details:'Details', noPrice:'Contact us for pricing', all:'All',
        products:'Products', categories:'Categories', reviews:'Customer reviews', faq:'Frequently asked questions',
        noResults:'No products match your search.', noProducts:'No active products right now.', loading:'Loading…',
        loadError:'Could not load data.', login:'Log in', profile:'Profile', loginNeeded:'Log in to place an order.',
        added:'Added to cart', ordered:'Order created', qty:'Qty', remove:'Remove', links:'Links',
        contact:'Contact', heroTitle:'Premium digital services', heroSub:'Netflix, YouTube Premium, ChatGPT and other subscriptions in one place.',
        heroCta:'View products', searchPh:'Search products…', footText:'Premium digital services on one platform.',
        prices:'Prices', chat:'Chat', account:'Account', priceNote:'Price is recalculated on the server at checkout.',
        selectPlan:'Term' },
};

const L = () => UI[getLang()] || UI.az;
const CART_KEY = 'digi_cart_v2';
const MAX_CART = 20;

let CATALOG = null;
let activeCat = '';
let query = '';
let lastJson = '';
let cart = loadCart();

/* ---------- köməkçilər ---------- */

// DOM elementi yaradır. Mətn həmişə textContent ilə yazılır (HTML inyeksiyası yoxdur).
function h(tag, props, ...children) {
  const el = document.createElement(tag);
  const o = props || {};
  for (const [k, v] of Object.entries(o)) {
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

// Şəkil və keçid üçün yalnız təhlükəsiz URL-lər (javascript: və s. rədd olunur)
const safeUrl = (u) => (/^(https?:\/\/|\/)/.test(u || '') ? u : '');
const initial = (name) => (name || '?').trim().charAt(0).toUpperCase();

function loadCart() {
  try {
    const v = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    if (!Array.isArray(v)) return [];
    return v
      .filter((i) => i && typeof i.key === 'string' && [1, 2, 3, 6, 12].includes(i.months) && i.quantity >= 1)
      .slice(0, MAX_CART);
  } catch {
    return [];
  }
}

function saveCart() {
  try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch {}
}

/* ---------- statik mətnlər və dil ---------- */

function applyStatic() {
  const d = L();
  $('#cartBtn').firstChild.textContent = d.cart + ' ';
  $('#search').placeholder = d.searchPh;
  $('#heroTag').textContent = 'DigiBaku';
  $('#catTitle').textContent = d.categories;
  $('#prodTitle').textContent = d.products;
  $('#revTitle').textContent = d.reviews;
  $('#faqTitle').textContent = d.faq;
  $('#cartTitle').textContent = d.cart;
  $('#cartTotalLabel').textContent = d.total;
  $('#checkoutBtn').textContent = d.checkout;
  $('#cartNote').textContent = d.priceNote;
  $('#footLinksTitle').textContent = d.links;
  $('#footPrices').textContent = d.prices;
  $('#footChat').textContent = d.chat;
  $('#footAccount').textContent = d.account;
  $('#footContactTitle').textContent = d.contact;
}

function markLang() {
  const lang = getLang();
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-lang]').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
  });
}

/* ---------- məlumatın yüklənməsi ---------- */

async function load(force = false) {
  try {
    const data = await api(`/public/catalog?lang=${getLang()}`);
    const json = JSON.stringify(data);
    if (!force && CATALOG && json === lastJson) return;
    lastJson = json;
    CATALOG = data;
    if (activeCat && !(CATALOG.categories || []).some((c) => c.key === activeCat)) activeCat = '';
    render();
  } catch (e) {
    console.error(e);
    if (!CATALOG) $('#productBox').replaceChildren(h('p', { class: 'muted', text: L().loadError }));
  }
}

function render() {
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

/* ---------- hero və bannerlər ---------- */

function renderHero() {
  const c = CATALOG.content || {};
  const d = L();
  $('#heroTitle').textContent = c.hero_title || d.heroTitle;
  $('#heroSub').textContent = c.hero_subtitle || d.heroSub;
  $('#heroCta').textContent = c.hero_cta || d.heroCta;

  const first = (CATALOG.banners || [])[0];
  const img = $('#heroImg');
  const src = safeUrl(first?.image_url);
  if (src) {
    img.src = src;
    img.alt = first.title || '';
    img.hidden = false;
  } else {
    img.hidden = true;
  }

  const rest = (CATALOG.banners || []).slice(1, 3);
  const promos = $('#promos');
  promos.replaceChildren(...rest.map((b) => h('a', { class: 'promo card', href: safeUrl(b.cta_url) || '#products' },
    b.cta_label ? h('span', { class: 'tag', text: b.cta_label }) : null,
    h('h3', { text: b.title || '' }),
    b.subtitle ? h('p', { text: b.subtitle }) : null,
  )));
  promos.hidden = rest.length === 0;
}

/* ---------- kateqoriyalar ---------- */

function renderCats() {
  const d = L();
  const cats = CATALOG.categories || [];
  const counts = {};
  (CATALOG.products || []).forEach((p) => {
    if (p.category) counts[p.category] = (counts[p.category] || 0) + 1;
  });

  const chips = [{ key: '', name: d.all }, ...cats];
  $('#catNav').replaceChildren(...chips.map((c) => h('button', {
    class: 'cat-chip', type: 'button', 'aria-pressed': String(activeCat === c.key),
    onclick: () => setCat(c.key), text: c.name,
  })));

  $('#catGrid').replaceChildren(...cats.map((c) => h('button', {
    class: 'cat-card', type: 'button',
    onclick: () => { setCat(c.key); $('#products').scrollIntoView({ behavior: 'smooth' }); },
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

function matches(p) {
  const q = query.toLowerCase();
  return (p.name || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
}

function renderProducts() {
  const d = L();
  const box = $('#productBox');
  const all = CATALOG.products || [];

  if (!all.length) {
    $('#prodCount').textContent = '';
    box.replaceChildren(h('div', { class: 'empty', text: d.noProducts }));
    return;
  }

  const list = all.filter((p) => (!activeCat || p.category === activeCat) && (!query || matches(p)));
  $('#prodCount').textContent = list.length ? String(list.length) : '';

  if (!list.length) {
    box.replaceChildren(h('div', { class: 'empty', text: d.noResults }));
    return;
  }
  box.replaceChildren(h('div', { class: 'product-grid' }, ...list.map(productCard)));
}

function productCard(p) {
  const d = L();
  const catName = (CATALOG.categories || []).find((c) => c.key === p.category)?.name;
  const img = safeUrl(p.image_url);
  const prices = p.prices || [];
  const hasPrices = prices.length > 0;

  const thumb = h('div', { class: 'p-thumb' }, img
    ? h('img', {
        src: img, alt: p.name || '', loading: 'lazy',
        onerror: (e) => e.currentTarget.replaceWith(h('span', { class: 'mono', text: initial(p.name) })),
      })
    : h('span', { class: 'mono', text: initial(p.name) }));

  const priceBox = hasPrices
    ? h('div', { class: 'p-plans' }, ...prices.map((x) => h('div', { class: 'p-plan' },
        h('span', { text: monthsLabel(x.months) }),
        x.sale_price
          ? h('span', null,
              h('s', { text: money(x.price) }),
              h('b', { class: 'p-sale', text: money(x.sale_price) }),
              h('span', { class: 'p-off', text: `-${Math.round((1 - x.sale_price / x.price) * 100)}%` }))
          : h('b', { text: money(x.price) }),
      )))
    : h('div', { class: 'p-nop', text: d.noPrice });

  const select = hasPrices
    ? h('select', {
        'aria-label': d.selectPlan,
        style: 'width:100%;min-height:40px;border-radius:10px;background:#0b1222;border:1px solid #1b2540;color:#f5f7fb;padding:6px 10px;font:inherit',
      }, ...prices.map((x) => h('option', { value: x.months, text: `${monthsLabel(x.months)} — ${money(x.current_price)}` })))
    : null;

  const actions = h('div', { class: 'p-actions' },
    hasPrices ? h('button', { class: 'btn btn-primary', type: 'button', text: d.order, onclick: () => orderNow(p, Number(select.value)) }) : null,
    hasPrices ? h('button', { class: 'btn btn-ghost', type: 'button', text: d.add, onclick: () => addItem(p, Number(select.value)) }) : null,
    h('a', { class: 'btn btn-ghost btn-block', href: `product.html?product=${encodeURIComponent(p.key)}`, text: d.details }),
  );

  return h('article', { class: 'p-card' },
    thumb,
    catName ? h('span', { class: 'p-cat', text: catName }) : null,
    h('h3', { class: 'p-name', text: p.name || '' }),
    p.description ? h('p', { class: 'p-desc', text: p.description }) : null,
    priceBox,
    select ? h('label', { class: 'small muted', style: 'display:grid;gap:6px' }, d.selectPlan, select) : null,
    actions,
  );
}

/* ---------- səbət ---------- */

function addItem(p, months) {
  const d = L();
  const option = (p.prices || []).find((x) => x.months === months);
  if (!option) return;

  const found = cart.find((i) => i.key === p.key && i.months === months);
  if (found) {
    found.quantity = Math.min(10, found.quantity + 1);
  } else {
    if (cart.length >= MAX_CART) return toast(errMsg({ code: 'generic' }), false);
    cart.push({ key: p.key, name: p.name, months, quantity: 1, price: option.current_price });
  }
  saveCart();
  updateCartCount();
  renderCart();
  toast(d.added);
}

function orderNow(p, months) {
  addItem(p, months);
  openCart(true);
}

function renderCart() {
  const d = L();
  const list = $('#cartList');
  if (!cart.length) {
    list.replaceChildren(h('p', { class: 'muted', text: d.cartEmpty }));
  } else {
    list.replaceChildren(...cart.map((i, idx) => h('div', { class: 'cart-item' },
      h('div', null,
        h('div', { class: 'nm', text: i.name }),
        h('div', { class: 'pr', text: `${monthsLabel(i.months)} · ${d.qty}: ${i.quantity} · ${money(i.price * i.quantity)}` })),
      h('button', {
        type: 'button', text: d.remove,
        onclick: () => { cart.splice(idx, 1); saveCart(); renderCart(); updateCartCount(); },
      }),
    )));
  }
  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  $('#cartTotal').textContent = money(total);
}

function updateCartCount() {
  $('#cartCount').textContent = String(cart.reduce((s, i) => s + i.quantity, 0));
}

function openCart(open) {
  $('#cartDrawer').hidden = !open;
  $('#scrim').hidden = !open;
  if (open) {
    renderCart();
    $('#cartClose').focus();
  }
}

async function checkout() {
  const d = L();
  if (!cart.length) return toast(d.cartEmpty, false);

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
    saveCart();
    renderCart();
    updateCartCount();
    openCart(false);
    toast(`${d.ordered} · ${money(order.total)}`);
    setTimeout(() => { location.href = 'profile.html'; }, 1200);
  } catch (e) {
    toast(errMsg(e), false);
  }
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
  $('#footText').textContent = c.footer_text || L().footText;
  $('#footEmail').textContent = s.email || '';
  $('#footPhone').textContent = s.phone || '';
  $('#footAddress').textContent = s.address || '';

  const digits = String(s.whatsapp || '').replace(/\D/g, '');
  const wa = $('#waFab');
  if (digits) {
    wa.href = `https://wa.me/${digits}`;
    wa.hidden = false;
  } else {
    wa.hidden = true;
  }
  $('#year').textContent = String(new Date().getFullYear());
}

/* ---------- hesab düyməsi ---------- */

async function setupAuth() {
  const d = L();
  let tk = null;
  try { tk = await token(); } catch {}
  const btn = $('#accountBtn');
  btn.textContent = tk ? d.profile : d.login;
  btn.href = tk ? 'profile.html' : 'login.html';
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
  load(true);
  setupAuth();
}));

$('#cartBtn').addEventListener('click', () => openCart(true));
$('#cartClose').addEventListener('click', () => openCart(false));
$('#scrim').addEventListener('click', () => openCart(false));
$('#checkoutBtn').addEventListener('click', checkout);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') openCart(false); });

/* ---------- başlanğıc ---------- */

function init() {
  markLang();
  applyStatic();
  $('#productBox').replaceChildren(h('p', { class: 'muted', text: L().loading }));
  renderCart();
  updateCartCount();
  load(true);
  setupAuth();
  sb().then((client) => client.auth.onAuthStateChange(() => setupAuth())).catch(() => {});

  // Admin dəyişikliklərini təxminən hər dəqiqə yoxlayır (səhifə görünəndə)
  setInterval(() => {
    if (document.visibilityState === 'visible') load(false);
  }, 60000);
}

init();

// DigiBaku storefront — BÜTÜN məzmun /api/public/catalog-dan gəlir. HTML-də sabit məhsul/qiymət yoxdur.
const API = '/api/public/catalog';
const LANG_PREF = 'digibaku_lang'; // yalnız UI dil seçimi (admin məlumatı deyil)

const UI = {
  az: { navCategories:'Kateqoriyalar', navProducts:'Məhsullar', navReviews:'Rəylər', navFaq:'FAQ', navPrices:'Qiymətlər',
        chat:'Çat', account:'Hesab', loadError:'Məlumat yüklənə bilmədi.', retry:'Yenidən cəhd et',
        heroTitle:'Premium rəqəmsal abunəliklər', heroSub:'Ən populyar xidmətlər, şəffaf qiymətlər, sürətli təhvil.',
        allProducts:'Bütün məhsullar', search:'Məhsul adını yazın…', sortDefault:'Standart', sortPriceAsc:'Qiymət: ucuzdan', sortPriceDesc:'Qiymət: bahadan', sortAz:'A → Z',
        noResults:'Axtarışa uyğun məhsul tapılmadı.', contactPrice:'Qiymət üçün bizimlə əlaqə saxlayın', reviews:'Müştəri rəyləri',
        faq:'Tez-tez verilən suallar', noProducts:'Hal-hazırda aktiv məhsul yoxdur.', month:'ay', year:'il', contact:'Əlaqə' },
  ru: { navCategories:'Категории', navProducts:'Товары', navReviews:'Отзывы', navFaq:'FAQ', navPrices:'Цены',
        chat:'Чат', account:'Аккаунт', loadError:'Не удалось загрузить данные.', retry:'Повторить',
        heroTitle:'Премиум цифровые подписки', heroSub:'Популярные сервисы, прозрачные цены, быстрая выдача.',
        allProducts:'Все товары', search:'Введите название товара…', sortDefault:'По умолчанию', sortPriceAsc:'Цена: по возрастанию', sortPriceDesc:'Цена: по убыванию', sortAz:'А → Я',
        noResults:'По вашему запросу ничего не найдено.', contactPrice:'Свяжитесь с нами для уточнения цены', reviews:'Отзывы клиентов',
        faq:'Частые вопросы', noProducts:'Сейчас нет активных товаров.', month:'мес.', year:'год', contact:'Контакты' },
  en: { navCategories:'Categories', navProducts:'Products', navReviews:'Reviews', navFaq:'FAQ', navPrices:'Prices',
        chat:'Chat', account:'Account', loadError:'Could not load data.', retry:'Try again',
        heroTitle:'Premium digital subscriptions', heroSub:'Popular services, transparent prices, fast delivery.',
        allProducts:'All products', search:'Search products…', sortDefault:'Default', sortPriceAsc:'Price: low to high', sortPriceDesc:'Price: high to low', sortAz:'A → Z',
        noResults:'No products match your search.', contactPrice:'Contact us for pricing', reviews:'Customer reviews',
        faq:'Frequently asked questions', noProducts:'No active products right now.', month:'mo', year:'yr', contact:'Contact' },
};

let lang = (() => { try { return localStorage.getItem(LANG_PREF) || 'az'; } catch { return 'az'; } })();
if (!UI[lang]) lang = 'az';
let data = null;
let activeCat = 'all', query = '', sort = 'default';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const t = (k) => UI[lang][k] ?? UI.az[k] ?? k;
const money = (v) => `${Number(v).toFixed(2)} AZN`;
const monthsLabel = (m) => (m === 12 ? `1 ${t('year')}` : `${m} ${t('month')}`);
const cheapest = (p) => (p.prices.length ? Math.min(...p.prices.map((x) => x.current_price)) : Infinity);
const waLink = () => (data?.settings?.whatsapp ? `https://wa.me/${String(data.settings.whatsapp).replace(/\D/g, '')}` : null);
const monogram = (name) => esc((name || '?').trim().charAt(0).toUpperCase());

function productCard(p) {
  const img = p.image_url
    ? `<img src="${esc(p.image_url)}" alt="${esc(p.name)}" loading="lazy" data-fb="${esc(p.name)}">`
    : `<span class="mono">${monogram(p.name)}</span>`;
  const prices = p.prices.length
    ? p.prices.map((x) => `<div class="price"><span>${monthsLabel(x.months)}</span><span class="amt">${x.sale_price
        ? `<s>${money(x.price)}</s><span class="sale">${money(x.sale_price)}</span>`
        : money(x.price)}</span></div>`).join('')
    : `<div class="contact">${t('contactPrice')}</div>`;
  return `<article class="card${p.is_featured ? ' wide' : ''}">
    <div class="thumb">${img}</div>
    <h3>${esc(p.name)}</h3>
    ${p.description ? `<p class="desc">${esc(p.description)}</p>` : ''}
    <div class="prices">${prices}</div>
    <a class="card-link" href="product.html?product=${encodeURIComponent(p.key)}" aria-label="${esc(p.name)}"></a>
  </article>`;
}

function filtered() {
  let list = data.products.slice();
  if (activeCat !== 'all') list = list.filter((p) => p.category === activeCat);
  if (query) {
    const q = query.toLowerCase();
    list = list.filter((p) => p.name.toLowerCase().includes(q) || p.key.includes(q));
  }
  if (sort === 'asc') list.sort((a, b) => cheapest(a) - cheapest(b));
  if (sort === 'desc') list.sort((a, b) => cheapest(b) - cheapest(a));
  if (sort === 'az') list.sort((a, b) => a.name.localeCompare(b.name));
  return list;
}

function renderProducts() {
  const box = $('#productsBox');
  const list = filtered();
  if (!data.products.length) { box.innerHTML = `<div class="empty">${t('noProducts')}</div>`; return; }
  if (!list.length) { box.innerHTML = `<div class="empty">${t('noResults')}</div>`; return; }

  const groups = new Map();
  for (const p of list) {
    const k = p.category || '_';
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(p);
  }
  const order = data.categories.map((c) => c.key);
  const keys = [...groups.keys()].sort((a, b) => (order.indexOf(a) + 1 || 999) - (order.indexOf(b) + 1 || 999));

  box.innerHTML = keys.map((k) => {
    const cat = data.categories.find((c) => c.key === k);
    const title = cat ? `${esc(cat.icon || '')} ${esc(cat.name)}` : t('allProducts');
    return `<div class="group-title" id="cat-${esc(k)}"><h2>${title}</h2><span class="muted">${groups.get(k).length}</span></div>
      <div class="grid">${groups.get(k).map(productCard).join('')}</div>`;
  }).join('');

  // Şəkil açılmadıqda ehtiyat görünüş (emoji yox, ad hərfi)
  box.querySelectorAll('img[data-fb]').forEach((img) => img.addEventListener('error', () => {
    const span = document.createElement('span');
    span.className = 'mono';
    span.textContent = monogram(img.dataset.fb);
    img.replaceWith(span);
  }, { once: true }));
}

function render() {
  const d = data;
  const hero = d.content.hero_title || t('heroTitle');
  const heroSub = d.content.hero_subtitle || t('heroSub');
  const heroCta = d.content.hero_cta || t('allProducts');
  const banner = d.banners[0];

  $('#content').innerHTML = `
    <section class="hero">
      <div>
        <div class="kicker">DigiBaku</div>
        <h1>${esc(hero)}</h1>
        <p>${esc(heroSub)}</p>
        <a class="btn" href="#products">${esc(heroCta)} →</a>
      </div>
      <div class="hero-card">
        ${banner?.image_url ? `<img src="${esc(banner.image_url)}" alt="">` : ''}
        <h3 style="position:relative">${esc(banner?.title || '')}</h3>
        ${banner?.cta_url ? `<a class="btn cta" href="${esc(banner.cta_url)}">${esc(banner.cta_label || '')}</a>` : ''}
      </div>
    </section>

    ${d.banners.length > 1 ? `<section><div class="banners">${d.banners.slice(1).map((b) => `
      <a class="banner" href="${esc(b.cta_url || '#products')}">
        <span class="kicker">${esc(b.cta_label || '')}</span><h3>${esc(b.title)}</h3><p class="muted">${esc(b.subtitle)}</p>
      </a>`).join('')}</div></section>` : ''}

    ${d.categories.length ? `<section id="categories"><div class="kicker">${t('navCategories')}</div>
      <div class="cats">${d.categories.map((c) => {
        const n = d.products.filter((p) => p.category === c.key).length;
        return `<button class="cat" data-cat="${esc(c.key)}"><span class="ico">${esc(c.icon || '')}</span>
          <span class="n">${esc(c.name)}</span><span class="c">${n} ${t('navProducts').toLowerCase()}</span></button>`;
      }).join('')}</div></section>` : ''}

    <section id="products">
      <div class="kicker">${t('navProducts')}</div>
      <div class="toolbar">
        <input id="q" type="search" placeholder="${esc(t('search'))}" value="${esc(query)}">
        <select id="sort">
          <option value="default">${t('sortDefault')}</option>
          <option value="asc">${t('sortPriceAsc')}</option>
          <option value="desc">${t('sortPriceDesc')}</option>
          <option value="az">${t('sortAz')}</option>
        </select>
      </div>
      <div id="productsBox"></div>
    </section>

    ${d.reviews.length ? `<section id="reviews"><div class="kicker">${t('reviews')}</div>
      <div class="reviews">${d.reviews.map((r) => `<article class="review">
        <div class="stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
        <p>${esc(r.text)}</p><div class="muted" style="margin-top:12px">${esc(r.author)}</div></article>`).join('')}</div></section>` : ''}

    ${d.faqs.length ? `<section id="faq"><div class="kicker">${t('navFaq')}</div><h2>${t('faq')}</h2>
      ${d.faqs.map((f) => `<details><summary>${esc(f.question)}</summary><p>${esc(f.answer)}</p></details>`).join('')}</section>` : ''}
  `;

  document.querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => {
    activeCat = b.dataset.cat;
    renderProducts();
    document.getElementById('products').scrollIntoView();
  }));
  $('#q').addEventListener('input', (e) => { query = e.target.value.trim(); renderProducts(); });
  $('#sort').value = sort;
  $('#sort').addEventListener('change', (e) => { sort = e.target.value; renderProducts(); });
  renderProducts();

  const s = d.settings;
  $('#footer').innerHTML = `
    <div><strong style="color:var(--text)">${esc(s.site_name || 'DigiBaku')}</strong>
      <p>${esc(d.content.footer_text || '')}</p></div>
    <div><strong style="color:var(--text)">${t('contact')}</strong>
      ${s.email ? `<a href="mailto:${esc(s.email)}">${esc(s.email)}</a>` : ''}
      ${s.phone ? `<a href="tel:${esc(s.phone)}">${esc(s.phone)}</a>` : ''}
      ${s.address ? `<span>${esc(s.address)}</span>` : ''}</div>
    <div><strong style="color:var(--text)">${t('navPrices')}</strong>
      <a href="qiymetler.html">${t('navPrices')}</a><a href="faq.html">${t('navFaq')}</a>
      <a href="/chat.html">${t('chat')}</a></div>`;

  const wa = $('#waFloat');
  const link = waLink();
  wa.hidden = !link;
  if (link) wa.href = link;

  $('#loading').hidden = true;
  $('#failed').hidden = true;
  $('#content').hidden = false;
  document.documentElement.lang = lang;
  applyUiLabels();
}

function applyUiLabels() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const k = el.dataset.i18n;
    if (UI[lang][k]) el.textContent = UI[lang][k];
  });
  document.querySelectorAll('[data-lang]').forEach((b) => {
    const on = b.dataset.lang === lang;
    b.setAttribute('aria-pressed', String(on));
    b.classList.toggle('on', on);
  });
  $('#retry').textContent = t('retry');
  $('#failed p').textContent = t('loadError');
}

function showError() {
  $('#loading').hidden = true;
  $('#failed').hidden = false;
  $('#content').hidden = true;
}

async function load() {
  $('#loading').hidden = false;
  $('#failed').hidden = true;
  try {
    const res = await fetch(`${API}?lang=${lang}`, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(String(res.status));
    data = await res.json();
    render();
  } catch (e) {
    console.error(e);
    showError();
  }
}

document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => {
  lang = b.dataset.lang;
  try { localStorage.setItem(LANG_PREF, lang); } catch {}
  load();
}));
$('#retry').addEventListener('click', load);
applyUiLabels();
load();

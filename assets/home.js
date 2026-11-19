/* DigiBaku — ana səhifə: hero, məhsullar bölməsi, kateqoriya filtrləri, AZ/RU/EN */
(function () {
  var TX = {
    az: {
      heroTitle: "Premium rəqəmsal xidmətlər, <em>sərfəli qiymətə</em>",
      heroSub: "Netflix, YouTube Premium, ChatGPT, Spotify və digər xidmətlər — bir yerdə.",
      heroBtn: "Məhsullara bax",
      prodTitle: "Məhsullar",
      prodSub: "Premium rəqəmsal xidmətlərimizi kəşf edin.",
      all: "Hamısı",
      from: "dən",
      details: "Ətraflı",
      empty: "Bu kateqoriyada məhsul yoxdur.",
      loadErr: "Məhsullar yüklənmədi. Səhifəni yeniləyin.",
      noImg: "Şəkil yoxdur",
      whyTitle: "DigiBaku-nun üstünlükləri",
      f1t: "Sürətli çatdırılma", f1d: "Sifarişiniz təsdiqləndikdən sonra hazırlanır.",
      f2t: "Şəffaf qiymət", f2d: "Qiymət səbətdə və sifarişdə eyni olur.",
      f3t: "Dəstək", f3d: "WhatsApp və chat vasitəsilə əlaqə saxlayın.",
      revTitle: "Müştəri rəyləri", revEmpty: "Rəylər tezliklə əlavə olunacaq."
    },
    ru: {
      heroTitle: "Премиальные цифровые сервисы, <em>по выгодной цене</em>",
      heroSub: "Netflix, YouTube Premium, ChatGPT, Spotify и другие сервисы — в одном месте.",
      heroBtn: "Смотреть товары",
      prodTitle: "Товары",
      prodSub: "Откройте для себя наши премиальные цифровые сервисы.",
      all: "Все",
      from: "от",
      details: "Подробнее",
      empty: "В этой категории пока нет товаров.",
      loadErr: "Не удалось загрузить товары. Обновите страницу.",
      noImg: "Нет изображения",
      whyTitle: "Преимущества DigiBaku",
      f1t: "Быстрая выдача", f1d: "Ваш заказ готовится сразу после подтверждения.",
      f2t: "Честная цена", f2d: "Цена в корзине и в заказе одинаковая.",
      f3t: "Поддержка", f3d: "Свяжитесь с нами через WhatsApp или чат.",
      revTitle: "Отзывы клиентов", revEmpty: "Отзывы скоро появятся."
    },
    en: {
      heroTitle: "Premium digital services, <em>at great prices</em>",
      heroSub: "Netflix, YouTube Premium, ChatGPT, Spotify and more — all in one place.",
      heroBtn: "Browse products",
      prodTitle: "Products",
      prodSub: "Discover our premium digital services.",
      all: "All",
      from: "from",
      details: "Details",
      empty: "No products in this category yet.",
      loadErr: "Products could not be loaded. Please refresh the page.",
      noImg: "No image",
      whyTitle: "Why DigiBaku",
      f1t: "Fast delivery", f1d: "Your order is prepared as soon as it is confirmed.",
      f2t: "Transparent pricing", f2d: "The price in your cart and order is the same.",
      f3t: "Support", f3d: "Reach us via WhatsApp or chat.",
      revTitle: "Customer reviews", revEmpty: "Reviews will be added soon."
    }
  };

  // Filtr düymələri: ad (dil üzrə) + category_key siyahısı
  var FILTERS = [
    { id: "all",   keys: null, az: "Hamısı",            ru: "Все",                 en: "All" },
    { id: "film",  keys: ["film_serial"], az: "Film və serial", ru: "Фильмы и сериалы", en: "Movies & series" },
    { id: "video", keys: ["video"],       az: "Video",          ru: "Видео",            en: "Video" },
    { id: "ai",    keys: ["ai"],          az: "Süni intellekt", ru: "Искусственный интеллект", en: "Artificial intelligence" },
    { id: "music", keys: ["music"],       az: "Musiqi",         ru: "Музыка",           en: "Music" },
    { id: "design",keys: ["design"],      az: "Dizayn",         ru: "Дизайн",           en: "Design" },
    { id: "vpn",   keys: ["security_vpn"],az: "VPN",            ru: "VPN",              en: "VPN" },
    { id: "games", keys: ["games"],       az: "Oyun və əyləncə",ru: "Игры и развлечения", en: "Games & fun" }
  ];

  var lang = DB.lang;
  var t = TX[lang] || TX.az;
  var state = { products: [], categories: [], active: "all" };

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  function setStatic() {
    document.getElementById("heroTitle").innerHTML = t.heroTitle;
    document.getElementById("heroSub").textContent = t.heroSub;
    document.getElementById("heroBtn").textContent = t.heroBtn;
    document.getElementById("prodTitle").textContent = t.prodTitle;
    document.getElementById("prodSub").textContent = t.prodSub;
    document.getElementById("whyTitle").textContent = t.whyTitle;
    document.getElementById("f1t").textContent = t.f1t; document.getElementById("f1d").textContent = t.f1d;
    document.getElementById("f2t").textContent = t.f2t; document.getElementById("f2d").textContent = t.f2d;
    document.getElementById("f3t").textContent = t.f3t; document.getElementById("f3d").textContent = t.f3d;
    document.getElementById("revTitle").textContent = t.revTitle;
    document.getElementById("revEmpty").textContent = t.revEmpty;
  }

  function productName(p) { return p.name[lang] || p.name.az || ""; }

  function drawFilters() {
    var wrap = document.getElementById("filters");
    wrap.innerHTML = FILTERS.map(function (f) {
      var label = f[lang] || f.az;
      if (f.id === "all") label = t.all;
      return '<button type="button" class="chip' + (state.active === f.id ? " on" : "") +
        '" data-f="' + f.id + '">' + esc(label) + "</button>";
    }).join("");
    wrap.querySelectorAll("[data-f]").forEach(function (b) {
      b.onclick = function () { state.active = b.dataset.f; drawFilters(); drawGrid(); };
    });
  }

  function visibleProducts() {
    var f = FILTERS.filter(function (x) { return x.id === state.active; })[0];
    if (!f || !f.keys) return state.products;
    return state.products.filter(function (p) { return f.keys.indexOf(p.category_key) !== -1; });
  }

  function drawGrid() {
    var grid = document.getElementById("productGrid");
    var list = visibleProducts();
    if (!list.length) { grid.innerHTML = '<div class="empty">' + esc(t.empty) + "</div>"; return; }
    grid.innerHTML = list.map(function (p) {
      var min = Math.min.apply(null, p.prices.map(function (x) { return x.price; }));
      var img = p.image_url
        ? '<img src="' + esc(p.image_url) + '" alt="' + esc(productName(p)) + '" loading="lazy" data-img>'
        : esc(productName(p));
      return '<div class="card"><div class="img">' + img + '</div><div class="body">' +
        '<span class="cat-label">' + esc(catName(p.category_key)) + "</span>" +
        "<h3>" + esc(productName(p)) + "</h3>" +
        '<span class="price">' + esc(t.from) + " " + min.toFixed(2) + " AZN</span>" +
        '<div class="actions"><a class="btn" href="product.html?slug=' + encodeURIComponent(p.slug) + '">' +
        esc(t.details) + "</a></div></div></div>";
    }).join("");
    // Şəkil yüklənmədikdə ad göstər (inline onerror CSP-yə görə istifadə olunmur)
    grid.querySelectorAll("img[data-img]").forEach(function (im) {
      im.addEventListener("error", function () { im.replaceWith(document.createTextNode(im.alt)); });
    });
  }

  function catName(key) {
    var c = state.categories.filter(function (x) { return x.key === key; })[0];
    return c ? (c["name_" + lang] || c.name_az) : "";
  }

  async function init() {
    setStatic();
    var r = await DBApi.get("/api/products");
    if (!r.ok) {
      document.getElementById("productGrid").innerHTML = '<div class="empty">' + esc(t.loadErr) + "</div>";
      drawFilters();
      return;
    }
    state.products = r.data.products || [];
    state.categories = r.data.categories || [];
    drawFilters();
    drawGrid();
  }

  document.addEventListener("DOMContentLoaded", init);
})();

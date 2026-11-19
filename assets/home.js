/* DigiBaku — ana səhifə: hero, kateqoriya düymələri (DB-dən), məhsul kartları, AZ/RU/EN */
(function () {
  var TX = {
    az: { heroTitle: "Premium rəqəmsal xidmətlər, <em>sərfəli qiymətə</em>",
      heroSub: "Netflix, YouTube Premium, ChatGPT, Spotify və digər xidmətlər — bir yerdə.",
      heroBtn: "Məhsullara bax", prodTitle: "Məhsullar",
      prodSub: "Premium rəqəmsal xidmətlərimizi kəşf edin.", all: "Hamısı",
      start: "başlanğıc", month: "ay", details: "Ətraflı bax", empty: "Bu kateqoriyada məhsul yoxdur.",
      loadErr: "Məhsullar yüklənmədi. Səhifəni yeniləyin.", whyTitle: "DigiBaku-nun üstünlükləri",
      f1t: "Sürətli çatdırılma", f1d: "Sifarişiniz təsdiqləndikdən sonra hazırlanır.",
      f2t: "Şəffaf qiymət", f2d: "Qiymət səbətdə və sifarişdə eyni olur.",
      f3t: "Dəstək", f3d: "WhatsApp və chat vasitəsilə əlaqə saxlayın.",
      revTitle: "Müştəri rəyləri", revEmpty: "Rəylər tezliklə əlavə olunacaq." },
    ru: { heroTitle: "Премиальные цифровые сервисы, <em>по выгодной цене</em>",
      heroSub: "Netflix, YouTube Premium, ChatGPT, Spotify и другие сервисы — в одном месте.",
      heroBtn: "Смотреть товары", prodTitle: "Товары",
      prodSub: "Откройте для себя наши премиальные цифровые сервисы.", all: "Все",
      start: "от", month: "мес.", details: "Подробнее", empty: "В этой категории пока нет товаров.",
      loadErr: "Не удалось загрузить товары. Обновите страницу.", whyTitle: "Преимущества DigiBaku",
      f1t: "Быстрая выдача", f1d: "Ваш заказ готовится сразу после подтверждения.",
      f2t: "Честная цена", f2d: "Цена в корзине и в заказе одинаковая.",
      f3t: "Поддержка", f3d: "Свяжитесь с нами через WhatsApp или чат.",
      revTitle: "Отзывы клиентов", revEmpty: "Отзывы скоро появятся." },
    en: { heroTitle: "Premium digital services, <em>at great prices</em>",
      heroSub: "Netflix, YouTube Premium, ChatGPT, Spotify and more — all in one place.",
      heroBtn: "Browse products", prodTitle: "Products",
      prodSub: "Discover our premium digital services.", all: "All",
      start: "from", month: "mo", details: "View details", empty: "No products in this category yet.",
      loadErr: "Products could not be loaded. Please refresh the page.", whyTitle: "Why DigiBaku",
      f1t: "Fast delivery", f1d: "Your order is prepared as soon as it is confirmed.",
      f2t: "Transparent pricing", f2d: "The price in your cart and order is the same.",
      f3t: "Support", f3d: "Reach us via WhatsApp or chat.",
      revTitle: "Customer reviews", revEmpty: "Reviews will be added soon." }
  };

  var lang = DB.lang;
  var t = TX[lang] || TX.az;
  var state = { products: [], categories: [], active: "all" };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function set(id, text) { var el = document.getElementById(id); if (el) el.textContent = text; }

  // Kartların və düymələrin stili (qara/qızılı, bənövşəyi yoxdur)
  var css = ".filters{display:flex;gap:8px;overflow-x:auto;padding:4px 0 14px;scrollbar-width:none}" +
    ".filters::-webkit-scrollbar{display:none}" +
    ".chip{flex:0 0 auto;border:1px solid var(--line);background:var(--card);color:var(--text);border-radius:999px;padding:10px 16px;font-size:14px;cursor:pointer;white-space:nowrap}" +
    ".chip.on{background:var(--gold);border-color:var(--gold);color:#000;font-weight:700}" +
    ".pgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}" +
    "@media(min-width:900px){.pgrid{grid-template-columns:repeat(4,1fr)}}" +
    ".pcard{display:flex;flex-direction:column;background:var(--card);border:1px solid var(--line);border-radius:18px;padding:14px;color:var(--text);transition:border-color .2s}" +
    ".pcard:hover{border-color:var(--gold)}" +
    ".pimg{width:84px;height:84px;border-radius:18px;background:var(--card2);border:1px solid var(--line);overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--muted);text-align:center;padding:6px}" +
    ".pimg img{width:100%;height:100%;object-fit:cover}" +
    ".pname{font-size:15px;font-weight:600;margin:12px 0 6px;line-height:1.35}" +
    ".pmeta{font-size:12px;color:var(--muted);margin-bottom:10px}" +
    ".pprice{color:var(--gold);font-size:18px;font-weight:700}" +
    ".pprice small{color:var(--muted);font-size:12px;font-weight:400;margin-right:4px}" +
    ".pbtn{margin-top:12px;display:block;text-align:center;border:1px solid var(--line);background:var(--card2);border-radius:12px;padding:10px;font-size:14px}";
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  function setStatic() {
    document.getElementById("heroTitle").innerHTML = t.heroTitle;
    set("heroSub", t.heroSub); set("heroBtn", t.heroBtn);
    set("prodTitle", t.prodTitle); set("prodSub", t.prodSub); set("whyTitle", t.whyTitle);
    set("f1t", t.f1t); set("f1d", t.f1d); set("f2t", t.f2t); set("f2d", t.f2d);
    set("f3t", t.f3t); set("f3d", t.f3d); set("revTitle", t.revTitle); set("revEmpty", t.revEmpty);
  }

  function productName(p) { return p.name[lang] || p.name.az || ""; }
  function catLabel(c) { return c["name_" + lang] || c.name_az; }

  function drawFilters() {
    var wrap = document.getElementById("filters");
    var list = [{ key: "all", label: t.all }].concat(state.categories.map(function (c) {
      return { key: c.key, label: catLabel(c) };
    }));
    wrap.innerHTML = list.map(function (f) {
      return '<button type="button" class="chip' + (state.active === f.key ? " on" : "") +
        '" data-f="' + esc(f.key) + '">' + esc(f.label) + "</button>";
    }).join("");
    wrap.querySelectorAll("[data-f]").forEach(function (b) {
      b.onclick = function () { state.active = b.dataset.f; drawFilters(); drawGrid(); };
    });
  }

  function visibleProducts() {
    if (state.active === "all") return state.products;
    return state.products.filter(function (p) { return p.category_key === state.active; });
  }

  function drawGrid() {
    var grid = document.getElementById("productGrid");
    var list = visibleProducts();
    if (!list.length) { grid.innerHTML = '<div class="empty">' + esc(t.empty) + "</div>"; return; }
    grid.className = "pgrid";
    grid.innerHTML = list.map(function (p) {
      var prices = p.prices.slice().sort(function (a, b) { return a.months - b.months; });
      var min = Math.min.apply(null, prices.map(function (x) { return x.price; }));
      var months = prices.map(function (x) { return x.months; }).join(" · ");
      var img = p.image_url
        ? '<img src="' + esc(p.image_url) + '" alt="' + esc(productName(p)) + '" data-img>'
        : esc(productName(p));
      return '<a class="pcard" href="product.html?slug=' + encodeURIComponent(p.slug) + '">' +
        '<div class="pimg">' + img + "</div>" +
        '<div class="pname">' + esc(productName(p)) + "</div>" +
        '<div class="pmeta">' + esc(months) + " " + esc(t.month) + "</div>" +
        '<div class="pprice"><small>' + esc(t.start) + "</small>" + min.toFixed(2) + " AZN</div>" +
        '<span class="pbtn">' + esc(t.details) + "</span>" +
        "</a>";
    }).join("");
    grid.querySelectorAll("img[data-img]").forEach(function (im) {
      im.addEventListener("error", function () { im.replaceWith(document.createTextNode(im.alt)); });
    });
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
    state.categories = (r.data.categories || []).filter(function (c) { return c.key; });
    drawFilters();
    drawGrid();
  }

  document.addEventListener("DOMContentLoaded", init);
})();

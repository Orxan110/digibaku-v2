(function () {
  var box = document.getElementById("pdBox");
  var bar = document.getElementById("stickyBar");

  // Hər hansı skript xətası ekranda görünsün
  window.addEventListener("error", function (e) {
    if (box && box.getAttribute("data-ready") !== "1") {
      box.innerHTML = '<div class="empty">Skript xətası:<br><small>' +
        String(e.message || e).replace(/</g, "&lt;") + "</small></div>";
    }
  });

  if (box) box.innerHTML = '<div class="empty">Məhsul yüklənir...</div>';

  var TX = {
    az: { back: "← Məhsullara qayıt", notFound: "Məhsul tapılmadı.", loadErr: "Məhsul yüklənmədi.",
      plans: "Müddət seçin", month: "ay", nameLbl: "Adınız", namePh: "Ad və soyad",
      phoneLbl: "WhatsApp nömrəniz", phonePh: "+994 50 000 00 00", orderBtn: "WhatsApp-la sifariş et",
      errName: "Ad daxil edin.", errPhone: "Düzgün WhatsApp nömrəsi daxil edin.", noImg: "Şəkil yoxdur",
      sale: "Endirim", waIntro: "Salam, sifariş vermək istəyirəm.", waProduct: "Məhsul", waPlan: "Müddət",
      waPrice: "Qiymət", waName: "Ad", waPhone: "Nömrə", stickyTo: "Ümumi", noWa: "WhatsApp nömrəsi hələ təyin olunmayıb.",
      addCart: "Səbətə at", added: "Səbətə əlavə olundu", goCart: "Səbətə keç" },
    ru: { back: "← Назад к товарам", notFound: "Товар не найден.", loadErr: "Не удалось загрузить товар.",
      plans: "Выберите срок", month: "мес.", nameLbl: "Ваше имя", namePh: "Имя и фамилия",
      phoneLbl: "Ваш номер WhatsApp", phonePh: "+994 50 000 00 00", orderBtn: "Заказать в WhatsApp",
      errName: "Введите имя.", errPhone: "Введите правильный номер WhatsApp.", noImg: "Нет изображения",
      sale: "Скидка", waIntro: "Здравствуйте, хочу оформить заказ.", waProduct: "Товар", waPlan: "Срок",
      waPrice: "Цена", waName: "Имя", waPhone: "Номер", stickyTo: "Итого", noWa: "Номер WhatsApp ещё не задан.",
      addCart: "В корзину", added: "Добавлено в корзину", goCart: "Перейти в корзину" },
    en: { back: "← Back to products", notFound: "Product not found.", loadErr: "Product could not be loaded.",
      plans: "Choose duration", month: "mo", nameLbl: "Your name", namePh: "Full name",
      phoneLbl: "Your WhatsApp number", phonePh: "+994 50 000 00 00", orderBtn: "Order via WhatsApp",
      errName: "Please enter your name.", errPhone: "Please enter a valid WhatsApp number.", noImg: "No image",
      sale: "Sale", waIntro: "Hello, I would like to place an order.", waProduct: "Product", waPlan: "Duration",
      waPrice: "Price", waName: "Name", waPhone: "Number", stickyTo: "Total", noWa: "WhatsApp number is not set yet.",
      addCart: "Add to cart", added: "Added to cart", goCart: "Go to cart" }
  };

  var lang = (window.DB && DB.lang) || "az";
  var t = TX[lang] || TX.az;
  var slug = new URLSearchParams(location.search).get("slug") || "";
  var state = { product: null, months: null, name: "", phone: "" };

  var css = ".pd-grid{display:grid;gap:18px;margin:18px 0}" +
    "@media(min-width:900px){.pd-grid{grid-template-columns:1fr 1fr;align-items:start}}" +
    ".pd-img{aspect-ratio:1/1;width:100%;max-width:460px;border-radius:22px;background:var(--card2);border:1px solid var(--line);overflow:hidden;display:flex;align-items:center;justify-content:center;color:var(--muted);text-align:center;padding:0}" +
    ".pd-img img{width:100%;height:100%;object-fit:cover}" +
    ".pd-title{font-size:clamp(22px,4vw,28px);line-height:1.25;margin:4px 0 8px}" +
    ".pd-label{font-size:14px;color:var(--muted);margin:16px 0 10px}" +
    ".plans{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;max-width:420px}" +
    ".plan{border:1px solid var(--line);background:var(--card);color:var(--text);border-radius:16px;padding:14px;text-align:left;cursor:pointer}" +
    ".plan.on{border-color:var(--gold);background:var(--card2)}" +
    ".plan .m{font-size:16px;font-weight:600}" +
    ".plan .p{color:var(--gold);font-size:16px;margin-top:4px}" +
    ".old{color:var(--muted);text-decoration:line-through;font-size:13px;margin-right:6px}" +
    ".sale{display:inline-block;background:var(--gold);color:#000;font-size:11px;font-weight:700;border-radius:999px;padding:3px 8px;margin-left:8px;vertical-align:middle}" +
    ".sumline{display:flex;align-items:baseline;gap:10px;margin:18px 0 12px;flex-wrap:wrap}" +
    ".sumline .big{color:var(--gold);font-size:30px;font-weight:800}" +
    ".sumline .mo{color:var(--muted)}" +
    ".order-box{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:18px;margin-top:18px;max-width:520px}" +
    ".fld{display:flex;flex-direction:column;gap:6px;margin-bottom:12px}" +
    ".fld label{font-size:14px;color:var(--muted)}" +
    ".fld input{background:var(--card2);border:1px solid var(--line);color:var(--text);border-radius:12px;padding:13px;font-size:16px;outline:none}" +
    ".err-txt{color:#f87171;font-size:14px;min-height:20px;margin-bottom:8px}" +
    ".btn-block{width:100%;padding:14px}" +
    ".sticky-bar{position:fixed;left:0;right:0;bottom:calc(64px + env(safe-area-inset-bottom));z-index:65;background:rgba(0,0,0,.96);border-top:1px solid var(--gold);padding:10px 14px}" +
    "@media(min-width:900px){.sticky-bar{bottom:0}}" +
    ".sticky-inner{max-width:1100px;margin:0 auto;display:flex;gap:10px;align-items:center;justify-content:space-between}" +
    ".sticky-inner .lbl{font-size:12px;color:var(--muted)}" +
    ".sticky-inner .amt{color:var(--gold);font-weight:800;font-size:18px}" +
    ".sticky-btns{display:flex;gap:8px;align-items:center}" +
    ".btn-out{background:transparent;border:1px solid var(--gold);color:var(--gold);font-weight:700}" +
    ".btn-out:hover{background:rgba(212,175,55,.12)}" +
    ".cart-ico{width:46px;height:44px;padding:0;font-size:20px;flex:0 0 auto}" +
    ".cart-msg{min-height:20px;margin:10px 0 0;font-size:14px;color:#86efac}" +
    ".cart-msg a{color:var(--gold);text-decoration:underline;margin-left:6px}" +
    ".pd-gap{height:10px}";
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function nameOf(p) { return (p.name && (p.name[lang] || p.name.az)) || ""; }
  function sorted(p) { return p.prices.slice().sort(function (a, b) { return a.months - b.months; }); }
  function pick(p, months) {
    return p.prices.filter(function (x) { return x.months === months; })[0] || null;
  }
  function priceHtml(x) {
    return (x.old ? '<span class="old">' + x.old.toFixed(2) + "</span>" : "") +
      "<span>" + x.price.toFixed(2) + " AZN</span>";
  }
  function validPhone(v) {
    return /^\+?\d{9,15}$/.test(String(v || "").replace(/[\s\-()]/g, ""));
  }
  function showErr(e) {
    box.innerHTML = '<div class="empty">' + esc(t.loadErr) + "<br><small>" +
      esc(String((e && e.message) || e)) + "</small></div>";
  }

  function waText(p, cur) {
    return [
      t.waIntro,
      t.waProduct + ": " + nameOf(p),
      t.waPlan + ": " + cur.months + " " + t.month,
      t.waPrice + ": " + cur.price.toFixed(2) + " AZN",
      t.waName + ": " + state.name.trim(),
      t.waPhone + ": " + state.phone.trim()
    ].join("\n");
  }

  function orderViaWhatsApp() {
    var p = state.product, cur = pick(p, state.months);
    var err = document.getElementById("orderErr");
    if (!state.name.trim()) { err.textContent = t.errName; return; }
    if (!validPhone(state.phone)) { err.textContent = t.errPhone; return; }
    err.textContent = "";
    var link = (window.DB && DB.waLink) ? DB.waLink(waText(p, cur)) : "#";
    if (link === "#") { err.textContent = t.noWa; return; }
    window.open(link, "_blank", "noopener");
  }

  function addToCart() {
    var p = state.product, cur = pick(p, state.months);
    if (!p || !cur || !window.DB || !DB.cart) return;
    DB.cart.add(p.product_key, state.months);
    var m = document.getElementById("cartMsg");
    if (m) m.innerHTML = "✓ " + esc(t.added) + ' <a href="cart.html">' + esc(t.goCart) + "</a>";
    var ico = document.getElementById("stickyCart");
    if (ico) { ico.textContent = "✓"; setTimeout(function () { var i2 = document.getElementById("stickyCart"); if (i2) i2.textContent = "🛒"; }, 1500); }
  }

  function setMeta(attr, name, content) {
    if (!content) return;
    var el = document.head.querySelector("meta[" + attr + '="' + name + '"]');
    if (!el) { el = document.createElement("meta"); el.setAttribute(attr, name); document.head.appendChild(el); }
    el.setAttribute("content", content);
  }
  function absUrl(u) {
    if (!u) return "";
    if (/^https?:\/\//i.test(u)) return u;
    return location.origin + (u.charAt(0) === "/" ? "" : "/") + u;
  }
  function applySeo(p) {
    var name = nameOf(p);
    var desc = ((p.description && (p.description[lang] || p.description.az)) || "").replace(/\s+/g, " ").trim();
    if (!desc) desc = name + " — DigiBaku. Sərfəli qiymət, sürətli çatdırılma.";
    if (desc.length > 160) desc = desc.slice(0, 157).replace(/\s+\S*$/, "") + "...";
    var url = location.origin + "/product?slug=" + encodeURIComponent(slug);
    var link = document.head.querySelector('link[rel="canonical"]');
    if (!link) { link = document.createElement("link"); link.setAttribute("rel", "canonical"); document.head.appendChild(link); }
    link.setAttribute("href", url);
    setMeta("name", "description", desc);
    setMeta("property", "og:title", name + " — DigiBaku");
    setMeta("property", "og:description", desc);
    setMeta("property", "og:type", "product");
    setMeta("property", "og:url", url);
    if (p.image_url) setMeta("property", "og:image", absUrl(p.image_url));
    setMeta("name", "twitter:card", p.image_url ? "summary_large_image" : "summary");
    var low = p.prices.reduce(function (a, b) { return b.price < a.price ? b : a; }, p.prices[0]);
    var high = p.prices.reduce(function (a, b) { return b.price > a.price ? b : a; }, p.prices[0]);
    var ld = {
      "@context": "https://schema.org", "@type": "Product", name: name, description: desc,
      image: p.image_url ? [absUrl(p.image_url)] : undefined, url: url, brand: { "@type": "Brand", name: "DigiBaku" },
      offers: { "@type": "AggregateOffer", priceCurrency: "AZN", lowPrice: low.price.toFixed(2), highPrice: high.price.toFixed(2),
        offerCount: p.prices.length, availability: "https://schema.org/InStock", url: url }
    };
    var tag = document.getElementById("pdLd");
    if (!tag) { tag = document.createElement("script"); tag.type = "application/ld+json"; tag.id = "pdLd"; document.head.appendChild(tag); }
    tag.textContent = JSON.stringify(ld);
  }

  function draw() {
    var p = state.product;
    var cur = pick(p, state.months);
    var name = nameOf(p);
    var img = p.image_url
      ? '<img src="' + esc(p.image_url) + '" alt="' + esc(name) + '" width="460" height="460" decoding="async" data-img>'
      : esc(t.noImg);

    var plans = sorted(p).map(function (x) {
      return '<button type="button" class="plan' + (x.months === state.months ? " on" : "") + '" data-m="' + x.months + '">' +
        '<div class="m">' + x.months + " " + esc(t.month) + "</div>" +
        '<div class="p">' + priceHtml(x) + "</div></button>";
    }).join("");

    box.setAttribute("data-ready", "1");
    box.innerHTML =
      '<p style="margin:12px 0"><a class="muted" href="products.html">' + esc(t.back) + "</a></p>" +
      '<div class="pd-grid">' +
        '<div><div class="pd-img">' + img + "</div></div>" +
        "<div>" +
          '<h1 class="pd-title">' + esc(name) + (cur && cur.old ? '<span class="sale">' + esc(t.sale) + "</span>" : "") + "</h1>" +
          '<div class="pd-label">' + esc(t.plans) + "</div>" +
          '<div class="plans">' + plans + "</div>" +
          '<div class="sumline"><span class="big">' + (cur ? priceHtml(cur) : "") +
          '</span><span class="mo">· ' + state.months + " " + esc(t.month) + "</span></div>" +
          '<div class="order-box" id="orderBox">' +
            '<div class="fld"><label for="fName">' + esc(t.nameLbl) + '</label><input id="fName" type="text" placeholder="' + esc(t.namePh) + '" value="' + esc(state.name) + '"></div>' +
            '<div class="fld"><label for="fPhone">' + esc(t.phoneLbl) + '</label><input id="fPhone" type="tel" placeholder="' + esc(t.phonePh) + '" value="' + esc(state.phone) + '"></div>' +
            '<div class="err-txt" id="orderErr"></div>' +
            '<button type="button" class="btn btn-out btn-block" id="addCartBtn">🛒 ' + esc(t.addCart) + "</button>" +
            '<div class="pd-gap"></div>' +
            '<button type="button" class="btn gold btn-block" id="orderBtn">' + esc(t.orderBtn) + "</button>" +
            '<div class="cart-msg" id="cartMsg"></div>' +
          "</div>" +
        "</div>" +
      "</div>";

    box.querySelectorAll("img[data-img]").forEach(function (im) {
      im.addEventListener("error", function () { im.replaceWith(document.createTextNode(im.alt)); });
    });
    box.querySelectorAll("[data-m]").forEach(function (b) {
      b.onclick = function () { state.months = Number(b.getAttribute("data-m")); draw(); };
    });
    document.getElementById("fName").oninput = function (e) { state.name = e.target.value; };
    document.getElementById("fPhone").oninput = function (e) { state.phone = e.target.value; };
    document.getElementById("orderBtn").onclick = orderViaWhatsApp;
    document.getElementById("addCartBtn").onclick = addToCart;

    bar.style.display = "";
    bar.className = "sticky-bar";
    bar.innerHTML =
      '<div class="sticky-inner">' +
        '<div><div class="lbl">' + esc(t.stickyTo) + " · " + state.months + " " + esc(t.month) + "</div>" +
        '<div class="amt">' + (cur ? priceHtml(cur) : "") + "</div></div>" +
        '<div class="sticky-btns">' +
        '<button type="button" class="btn btn-out cart-ico" id="stickyCart" aria-label="' + esc(t.addCart) + '" title="' + esc(t.addCart) + '">🛒</button>' +
        '<button type="button" class="btn gold" id="stickyOrder">' + esc(t.orderBtn) + "</button></div>" +
      "</div>";
    document.getElementById("stickyCart").onclick = addToCart;
    document.getElementById("stickyOrder").onclick = function () {
      document.getElementById("orderBox").scrollIntoView({ behavior: "smooth", block: "center" });
      orderViaWhatsApp();
    };
  }

  function init() {
    var drawn = false;
    DBApi.swr("/api/products", function (data, fromCache) {
      try {
        if (!data) { showErr("API cavabı alınmadı"); return; }
        var p = (data.products || []).filter(function (x) { return x.slug === slug; })[0];
        if (!p) {
          if (fromCache) return; // təzə cavabı gözləyirik
          box.setAttribute("data-ready", "1");
          box.innerHTML = '<div class="empty">' + esc(t.notFound) + ' <a href="products.html">' + esc(t.back) + "</a></div>";
          bar.style.display = "none";
          return;
        }
        document.title = nameOf(p) + " — DigiBaku";
        state.product = p;
        if (window.DB) DB.currentProduct = p;
        if (!pick(p, state.months)) state.months = sorted(p)[0].months;
        applySeo(p);
        draw();
        if (!drawn) {
          drawn = true;
          // Giriş edibsə, qeydiyyatdakı ad avtomatik doldurulur (məcburi deyil)
          if (window.DigiAuth) {
            DigiAuth.getSession().then(function (r) {
              var nm = r && r.session && r.session.user && r.session.user.name;
              var inp = document.getElementById("fName");
              if (nm && inp && !inp.value) { inp.value = nm; state.name = nm; }
            }).catch(function () {});
          }
        }
      } catch (e) { showErr(e); }
    });
  }

  init();
})();

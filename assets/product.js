/* DigiBaku — məhsul səhifəsi: plan seçimi, sifariş məlumatları, WhatsApp, səbət, sabit panel */
(function () {
  var TX = {
    az: { back: "← Məhsullara qayıt", notFound: "Məhsul tapılmadı.", loadErr: "Məhsul yüklənmədi. Səhifəni yeniləyin.",
      plans: "Müddət seçin", month: "ay", price: "Qiymət", nameLbl: "Adınız", namePh: "Ad və soyad",
      phoneLbl: "WhatsApp nömrəniz", phonePh: "+994 50 000 00 00", consent: "Sifariş statusu və yenilənmə xatırlatmalarını WhatsApp-dan almağa razıyam.",
      orderInfo: "Sifariş məlumatları", orderBtn: "WhatsApp-la sifariş et", addCart: "Səbətə at", added: "Səbətə əlavə olundu.",
      errName: "Ad daxil edin.", errPhone: "Düzgün WhatsApp nömrəsi daxil edin.", noImg: "Şəkil yoxdur",
      waIntro: "Salam, sifariş vermək istəyirəm.", waProduct: "Məhsul", waPlan: "Müddət", waPrice: "Qiymət",
      waName: "Ad", waPhone: "Nömrə", stickyTo: "Ümumi" },
    ru: { back: "← Назад к товарам", notFound: "Товар не найден.", loadErr: "Не удалось загрузить товар. Обновите страницу.",
      plans: "Выберите срок", month: "мес.", price: "Цена", nameLbl: "Ваше имя", namePh: "Имя и фамилия",
      phoneLbl: "Ваш номер WhatsApp", phonePh: "+994 50 000 00 00", consent: "Я согласен получать статус заказа и напоминания о продлении в WhatsApp.",
      orderInfo: "Данные заказа", orderBtn: "Заказать в WhatsApp", addCart: "В корзину", added: "Добавлено в корзину.",
      errName: "Введите имя.", errPhone: "Введите правильный номер WhatsApp.", noImg: "Нет изображения",
      waIntro: "Здравствуйте, хочу оформить заказ.", waProduct: "Товар", waPlan: "Срок", waPrice: "Цена",
      waName: "Имя", waPhone: "Номер", stickyTo: "Итого" },
    en: { back: "← Back to products", notFound: "Product not found.", loadErr: "Product could not be loaded. Please refresh.",
      plans: "Choose duration", month: "mo", price: "Price", nameLbl: "Your name", namePh: "Full name",
      phoneLbl: "Your WhatsApp number", phonePh: "+994 50 000 00 00", consent: "I agree to receive order status and renewal reminders on WhatsApp.",
      orderInfo: "Order details", orderBtn: "Order via WhatsApp", addCart: "Add to cart", added: "Added to cart.",
      errName: "Please enter your name.", errPhone: "Please enter a valid WhatsApp number.", noImg: "No image",
      waIntro: "Hello, I would like to place an order.", waProduct: "Product", waPlan: "Duration", waPrice: "Price",
      waName: "Name", waPhone: "Number", stickyTo: "Total" }
  };

  var lang = DB.lang;
  var t = TX[lang] || TX.az;
  var WA = "https://wa.me/994513626349";

  var css = ".pd-grid{display:grid;gap:18px;margin:18px 0}" +
    "@media(min-width:900px){.pd-grid{grid-template-columns:1fr 1fr;align-items:start}}" +
    ".pd-img{aspect-ratio:1/1;max-width:260px;border-radius:22px;background:var(--card2);border:1px solid var(--line);overflow:hidden;display:flex;align-items:center;justify-content:center;color:var(--muted);text-align:center;padding:12px}" +
    ".pd-img img{width:100%;height:100%;object-fit:cover}" +
    ".pd-title{font-size:clamp(22px,4vw,28px);line-height:1.25;margin:4px 0 8px}" +
    ".pd-desc{color:var(--muted);margin-bottom:14px}" +
    ".pd-label{font-size:14px;color:var(--muted);margin:16px 0 10px}" +
    ".plans{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}" +
    ".plan{border:1px solid var(--line);background:var(--card);color:var(--text);border-radius:16px;padding:14px;text-align:left;cursor:pointer}" +
    ".plan.on{border-color:var(--gold);background:var(--card2)}" +
    ".plan .m{font-size:16px;font-weight:600}" +
    ".plan .p{color:var(--gold);font-size:16px;margin-top:4px}" +
    ".sumline{display:flex;align-items:baseline;gap:10px;margin:18px 0 12px;flex-wrap:wrap}" +
    ".sumline .big{color:var(--gold);font-size:30px;font-weight:800}" +
    ".sumline .mo{color:var(--muted)}" +
    ".order-box{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:18px;margin-top:16px}" +
    ".order-box h3{font-size:18px;margin-bottom:12px}" +
    ".fld{display:flex;flex-direction:column;gap:6px;margin-bottom:12px}" +
    ".fld label{font-size:14px;color:var(--muted)}" +
    ".fld input[type=text],.fld input[type=tel]{background:var(--card2);border:1px solid var(--line);color:var(--text);border-radius:12px;padding:13px;font-size:16px;outline:none}" +
    ".fld input:focus{border-color:var(--gold)}" +
    ".chk{display:flex;gap:10px;align-items:flex-start;font-size:13px;color:var(--muted);margin:4px 0 14px}" +
    ".chk input{margin-top:3px;accent-color:#d4af37}" +
    ".btnrow{display:flex;flex-direction:column;gap:10px}" +
    ".btn-block{width:100%;padding:14px}" +
    ".err-txt{color:#f87171;font-size:14px;min-height:20px;margin-bottom:8px}" +
    ".ok-txt{color:#86efac;font-size:14px;min-height:20px;margin-bottom:8px}" +
    ".sticky-bar{position:fixed;left:0;right:0;bottom:calc(64px + env(safe-area-inset-bottom));z-index:65;background:rgba(0,0,0,.96);border-top:1px solid var(--gold);padding:10px 14px}" +
    "@media(min-width:900px){.sticky-bar{bottom:0}}" +
    ".sticky-inner{max-width:1100px;margin:0 auto;display:flex;gap:10px;align-items:center;justify-content:space-between}" +
    ".sticky-inner .lbl{font-size:12px;color:var(--muted)}" +
    ".sticky-inner .amt{color:var(--gold);font-weight:800;font-size:18px}" +
    ".pd-wrap{padding-bottom:160px}" +
    "@media(max-width:899px){.pd-wrap{padding-right:76px}}";
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  var slug = new URLSearchParams(location.search).get("slug") || "";
  var box = document.getElementById("pdBox");
  var bar = document.getElementById("stickyBar");
  var state = { product: null, months: null, name: "", phone: "", consent: false };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function pick(p, months) {
    return p.prices.filter(function (x) { return x.months === months; })[0] || null;
  }
  function validPhone(v) {
    var d = String(v || "").replace(/[\s\-()]/g, "");
    return /^\+?\d{9,15}$/.test(d);
  }
  function waText(p, cur) {
    var lines = [
      t.waIntro,
      t.waProduct + ": " + (p.name[lang] || p.name.az),
      t.waPlan + ": " + cur.months + " " + t.month,
      t.waPrice + ": " + cur.price.toFixed(2) + " AZN",
      t.waName + ": " + state.name.trim(),
      t.waPhone + ": " + state.phone.trim()
    ];
    return lines.join("\n");
  }

  function orderViaWhatsApp() {
    var p = state.product, cur = pick(p, state.months);
    var err = document.getElementById("orderErr");
    if (!state.name.trim()) { err.textContent = t.errName; document.getElementById("fName").focus(); return; }
    if (!validPhone(state.phone)) { err.textContent = t.errPhone; document.getElementById("fPhone").focus(); return; }
    err.textContent = "";
    window.open(WA + "?text=" + encodeURIComponent(waText(p, cur)), "_blank", "noopener");
  }

  function addToCart() {
    var ok = document.getElementById("addOk");
    DB.cart.add(state.product.product_key, state.months);
    ok.textContent = t.added;
  }

  function draw() {
    var p = state.product;
    var cur = pick(p, state.months);
    var name = p.name[lang] || p.name.az || "";
    var desc = (p.description && (p.description[lang] || p.description.az)) || "";
    var img = p.image_url
      ? '<img src="' + esc(p.image_url) + '" alt="' + esc(name) + '" data-img>'
      : esc(t.noImg);

    var plans = p.prices.slice().sort(function (a, b) { return a.months - b.months; }).map(function (x) {
      return '<button type="button" class="plan' + (x.months === state.months ? " on" : "") + '" data-m="' + x.months + '">' +
        '<div class="m">' + x.months + " " + esc(t.month) + "</div>" +
        '<div class="p">' + x.price.toFixed(2) + " AZN</div></button>";
    }).join("");

    box.innerHTML =
      '<p style="margin:12px 0"><a class="muted" href="products.html">' + esc(t.back) + "</a></p>" +
      '<div class="pd-grid">' +
        '<div><div class="pd-img">' + img + "</div></div>" +
        "<div>" +
          '<h1 class="pd-title">' + esc(name) + "</h1>" +
          (desc ? '<p class="pd-desc">' + esc(desc) + "</p>" : "") +
          '<div class="pd-label">' + esc(t.plans) + "</div>" +
          '<div class="plans">' + plans + "</div>" +
          '<div class="sumline"><span class="big">' + (cur ? cur.price.toFixed(2) : "") + ' AZN</span><span class="mo">· ' + state.months + " " + esc(t.month) + "</span></div>" +
          '<div class="order-box" id="orderBox">' +
            "<h3>" + esc(t.orderInfo) + "</h3>" +
            '<div class="fld"><label for="fName">' + esc(t.nameLbl) + '</label><input id="fName" type="text" autocomplete="name" placeholder="' + esc(t.namePh) + '" value="' + esc(state.name) + '"></div>' +
            '<div class="fld"><label for="fPhone">' + esc(t.phoneLbl) + '</label><input id="fPhone" type="tel" autocomplete="tel" placeholder="' + esc(t.phonePh) + '" value="' + esc(state.phone) + '"></div>' +
            '<label class="chk"><input id="fConsent" type="checkbox"' + (state.consent ? " checked" : "") + "> <span>" + esc(t.consent) + "</span></label>" +
            '<div class="err-txt" id="orderErr"></div>' +
            '<div class="btnrow">' +
              '<button type="button" class="btn gold btn-block" id="orderBtn">' + esc(t.orderBtn) + "</button>" +
              '<button type="button" class="btn btn-block" id="addBtn">' + esc(t.addCart) + "</button>" +
              '<div class="ok-txt" id="addOk"></div>' +
            "</div>" +
          "</div>" +
        "</div>" +
      "</div>";

    box.querySelectorAll("img[data-img]").forEach(function (im) {
      im.addEventListener("error", function () { im.replaceWith(document.createTextNode(im.alt)); });
    });
    box.querySelectorAll("[data-m]").forEach(function (b) {
      b.onclick = function () { state.months = Number(b.dataset.m); draw(); };
    });
    document.getElementById("fName").oninput = function (e) { state.name = e.target.value; };
    document.getElementById("fPhone").oninput = function (e) { state.phone = e.target.value; };
    document.getElementById("fConsent").onchange = function (e) { state.consent = e.target.checked; };
    document.getElementById("orderBtn").onclick = orderViaWhatsApp;
    document.getElementById("addBtn").onclick = addToCart;

    bar.style.display = "";
    bar.innerHTML =
      '<div class="sticky-inner">' +
        '<div><div class="lbl">' + esc(t.stickyTo) + " · " + state.months + " " + esc(t.month) + "</div>" +
        '<div class="amt">' + (cur ? cur.price.toFixed(2) : "") + " AZN</div></div>" +
        '<button type="button" class="btn gold" id="stickyOrder">' + esc(t.orderBtn) + "</button>" +
      "</div>";
    document.getElementById("stickyOrder").onclick = function () {
      document.getElementById("orderBox").scrollIntoView({ behavior: "smooth", block: "center" });
      orderViaWhatsApp();
    };
  }

  async function init() {
    var r = await DBApi.get("/api/products");
    if (!r.ok) { box.innerHTML = '<div class="empty">' + esc(t.loadErr) + "</div>"; return; }
    var p = (r.data.products || []).filter(function (x) { return x.slug === slug; })[0];
    if (!p) {
      box.innerHTML = '<div class="empty">' + esc(t.notFound) + ' <a href="products.html">' + esc(t.back) + "</a></div>";
      return;
    }
    document.title = (p.name[lang] || p.name.az) + " — DigiBaku";
    state.product = p;
    state.months = p.prices.slice().sort(function (a, b) { return a.months - b.months; })[0].months;
    draw();
  }

  document.addEventListener("DOMContentLoaded", init);
})();

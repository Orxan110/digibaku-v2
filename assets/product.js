/* DigiBaku — məhsul detal səhifəsi: müddət seçimi, qiymət, səbət, WhatsApp, sabit panel */
(function () {
  var TX = {
    az: { back: "← Məhsullara qayıt", notFound: "Məhsul tapılmadı.", loadErr: "Məhsul yüklənmədi. Səhifəni yeniləyin.",
      duration: "Müddət", month: "ay", addCart: "Səbətə at", added: "Səbətə əlavə olundu.",
      buyWa: "WhatsApp-la sifariş et", wa: "Salam, bu məhsulu sifariş etmək istəyirəm: ",
      stickyLabel: "Seçilmiş paket", noImg: "Şəkil yoxdur", pickMonth: "Müddəti seçin" },
    ru: { back: "← Назад к товарам", notFound: "Товар не найден.", loadErr: "Не удалось загрузить товар. Обновите страницу.",
      duration: "Срок", month: "мес.", addCart: "В корзину", added: "Добавлено в корзину.",
      buyWa: "Заказать в WhatsApp", wa: "Здравствуйте, хочу заказать этот товар: ",
      stickyLabel: "Выбранный пакет", noImg: "Нет изображения", pickMonth: "Выберите срок" },
    en: { back: "← Back to products", notFound: "Product not found.", loadErr: "Product could not be loaded. Please refresh.",
      duration: "Duration", month: "mo", addCart: "Add to cart", added: "Added to cart.",
      buyWa: "Order via WhatsApp", wa: "Hello, I would like to order this product: ",
      stickyLabel: "Selected plan", noImg: "No image", pickMonth: "Choose duration" }
  };

  var lang = DB.lang;
  var t = TX[lang] || TX.az;
  var WA = "https://wa.me/994513626349";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  var slug = new URLSearchParams(location.search).get("slug") || "";
  var box = document.getElementById("pdBox");
  var bar = document.getElementById("stickyBar");

  function pick(p, months) {
    return p.prices.filter(function (x) { return x.months === months; })[0] || null;
  }

  function waLink(name, cur) {
    var text = t.wa + name +
      (cur ? " (" + cur.months + " " + t.month + ", " + cur.price.toFixed(2) + " AZN)" : "");
    return WA + "?text=" + encodeURIComponent(text);
  }

  function render(p, sel) {
    var name = p.name[lang] || p.name.az || "";
    var desc = (p.description && (p.description[lang] || p.description.az)) || "";
    var feats = (p.features && (p.features[lang] && p.features[lang].length ? p.features[lang] : p.features.az)) || [];
    var cur = pick(p, sel);

    var img = p.image_url
      ? '<img src="' + esc(p.image_url) + '" alt="' + esc(name) + '" data-img>'
      : esc(t.noImg);

    var opts = p.prices.map(function (x) {
      return '<button type="button" class="pd-opt' + (x.months === sel ? " on" : "") + '" data-m="' + x.months + '">' +
        x.months + " " + t.month + "<small>" + x.price.toFixed(2) + " AZN</small></button>";
    }).join("");

    box.innerHTML =
      '<p style="margin:12px 0"><a class="muted" href="products.html">' + esc(t.back) + "</a></p>" +
      '<div class="pd-grid">' +
        '<div class="pd-img">' + img + "</div>" +
        "<div>" +
          '<h1 class="pd-title">' + esc(name) + "</h1>" +
          (desc ? '<p class="pd-desc">' + esc(desc) + "</p>" : "") +
          (feats.length ? '<ul class="pd-feats">' + feats.map(function (f) { return "<li>" + esc(f) + "</li>"; }).join("") + "</ul>" : "") +
          '<div class="pd-label">' + esc(t.duration) + "</div>" +
          '<div class="pd-opts">' + opts + "</div>" +
          '<p class="price" style="font-size:24px;margin:16px 0 6px">' + (cur ? cur.price.toFixed(2) + " AZN" : "") + "</p>" +
          '<button type="button" class="btn gold" id="addBtn" style="width:100%">' + esc(t.addCart) + "</button>" +
          '<p class="ok" id="addOk" style="margin-top:8px"></p>' +
          '<a class="btn" target="_blank" rel="noopener" style="width:100%;margin-top:8px" href="' + esc(waLink(name, cur)) + '">' + esc(t.buyWa) + "</a>" +
        "</div>" +
      "</div>";

    box.querySelectorAll("img[data-img]").forEach(function (im) {
      im.addEventListener("error", function () { im.replaceWith(document.createTextNode(im.alt)); });
    });
    box.querySelectorAll("[data-m]").forEach(function (b) {
      b.onclick = function () { render(p, Number(b.dataset.m)); };
    });
    document.getElementById("addBtn").onclick = function () {
      DB.cart.add(p.product_key, sel);
      document.getElementById("addOk").textContent = t.added;
    };

    bar.style.display = "";
    bar.innerHTML =
      '<div class="sticky-inner">' +
        '<div class="sticky-price">' + esc(t.stickyLabel) + " · " + sel + " " + t.month +
          "<b>" + (cur ? cur.price.toFixed(2) + " AZN" : esc(t.pickMonth)) + "</b></div>" +
        '<div class="sticky-actions">' +
          '<a class="btn" target="_blank" rel="noopener" href="' + esc(waLink(name, cur)) + '">WhatsApp</a>' +
          '<button type="button" class="btn gold" id="stickyAdd">' + esc(t.addCart) + "</button>" +
        "</div></div>";
    document.getElementById("stickyAdd").onclick = function () {
      DB.cart.add(p.product_key, sel);
      document.getElementById("addOk").textContent = t.added;
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
    render(p, p.prices[0].months);
  }

  document.addEventListener("DOMContentLoaded", init);
})();

/* DigiBaku — Məhsullar səhifəsi (siyahı): kateqoriya filtri + böyük şəkilli kartlar */
(function () {
  var lang = (window.DB && DB.lang) || "az";
  var grid = document.getElementById("productGrid");
  var bar = document.getElementById("catBar");
  if (!grid) return;

  var TX = {
    az: { all: "Hamısı", from: "başlanğıc", month: "ay", details: "Ətraflı bax", empty: "Məhsul tapılmadı.", sale: "Endirim", err: "Məhsullar yüklənmədi. Səhifəni yeniləyin." },
    ru: { all: "Все", from: "от", month: "мес.", details: "Подробнее", empty: "Товары не найдены.", sale: "Скидка", err: "Не удалось загрузить товары. Обновите страницу." },
    en: { all: "All", from: "from", month: "mo", details: "View details", empty: "No products found.", sale: "Sale", err: "Products could not be loaded. Please refresh." }
  };
  var t = TX[lang] || TX.az;

  var css = ".cats-bar{display:flex;gap:8px;overflow-x:auto;padding:4px 0 14px;scrollbar-width:none}" +
    ".cats-bar::-webkit-scrollbar{display:none}" +
    ".chip{flex:0 0 auto;border:1px solid var(--line);background:var(--card);color:var(--text);border-radius:999px;padding:10px 16px;font-size:14px;cursor:pointer;white-space:nowrap}" +
    ".chip.on{background:var(--gold);border-color:var(--gold);color:#000;font-weight:700}" +
    ".pgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}" +
    "@media(min-width:900px){.pgrid{grid-template-columns:repeat(4,1fr);gap:16px}}" +
    ".pcard{display:flex;flex-direction:column;background:var(--card);border:1px solid var(--line);border-radius:18px;padding:10px;color:var(--text);transition:border-color .2s;position:relative}" +
    ".pcard:hover{border-color:var(--gold)}" +
    ".pbadge{position:absolute;top:18px;right:18px;z-index:2;background:var(--gold);color:#000;font-size:11px;font-weight:700;border-radius:999px;padding:3px 8px}" +
    ".pimg{width:100%;aspect-ratio:1/1;border-radius:14px;background:var(--card2);border:1px solid var(--line);overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:13px;color:var(--muted);text-align:center;padding:0}" +
    ".pimg img{width:100%;height:100%;object-fit:cover}" +
    ".pname{font-size:15px;font-weight:600;margin:12px 4px 6px;line-height:1.35}" +
    ".pmeta{font-size:12px;color:var(--muted);margin:0 4px 8px}" +
    ".pprice{color:var(--gold);font-size:18px;font-weight:700;margin:0 4px}" +
    ".pprice small{color:var(--muted);font-size:12px;font-weight:400;margin-right:4px}" +
    ".pold{color:var(--muted);font-size:13px;text-decoration:line-through;margin-right:6px}" +
    ".pbtn{margin:12px 4px 4px;display:block;text-align:center;border:1px solid var(--line);background:var(--card2);border-radius:12px;padding:10px;font-size:14px}" +
    ".sk{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:10px}" +
    ".sk i{display:block;border-radius:12px;background:linear-gradient(90deg,#1a1a1a 25%,#262626 50%,#1a1a1a 75%);background-size:200% 100%;animation:skm 1.2s infinite}" +
    ".sk i.a{aspect-ratio:1/1}.sk i.b{height:14px;margin-top:12px;width:80%}.sk i.c{height:14px;margin-top:8px;width:50%}" +
    "@keyframes skm{from{background-position:200% 0}to{background-position:-200% 0}}";
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function nameOf(p) { return (p.name && (p.name[lang] || p.name.az)) || ""; }
  function catLabel(c) { return c["name_" + lang] || c.name_az || ""; }

  function render(data) {
    try {
      var params = new URLSearchParams(location.search);
      var cat = params.get("cat") || "";
      var q = (params.get("q") || "").toLowerCase();

      var cats = (data.categories || []).filter(function (c) { return c.key; });
      var items = data.products || [];

      bar.className = "cats-bar";
      bar.innerHTML = '<a class="chip' + (!cat ? " on" : "") + '" href="products.html">' + esc(t.all) + "</a>" +
        cats.map(function (c) {
          return '<a class="chip' + (cat === c.key ? " on" : "") + '" href="products.html?cat=' + encodeURIComponent(c.key) + '">' + esc(catLabel(c)) + "</a>";
        }).join("");

      var list = items.filter(function (p) {
        if (cat && p.category_key !== cat) return false;
        if (q) {
          var hay = [p.name.az, p.name.ru, p.name.en].join(" ").toLowerCase();
          if (hay.indexOf(q) < 0) return false;
        }
        return true;
      });

      if (!list.length) { grid.innerHTML = '<div class="empty">' + esc(t.empty) + "</div>"; return; }

      grid.className = "pgrid";
      grid.innerHTML = list.map(function (p) {
        var prices = p.prices.slice().sort(function (a, b) { return a.months - b.months; });
        var best = prices.reduce(function (a, b) { return b.price < a.price ? b : a; }, prices[0]);
        var hasSale = prices.some(function (x) { return x.old; });
        var months = prices.map(function (x) { return x.months; }).join(" · ");
        var img = p.image_url
          ? '<img src="' + esc(p.image_url) + '" alt="' + esc(nameOf(p)) + '" loading="lazy" data-img>'
          : esc(nameOf(p));
        var priceHtml = '<div class="pprice"><small>' + esc(t.from) + "</small>" +
          (best.old ? '<span class="pold">' + best.old.toFixed(2) + "</span>" : "") + best.price.toFixed(2) + " AZN</div>";
        return '<a class="pcard" href="product.html?slug=' + encodeURIComponent(p.slug) + '">' +
          (hasSale ? '<span class="pbadge">' + esc(t.sale) + "</span>" : "") +
          '<div class="pimg">' + img + "</div>" +
          '<div class="pname">' + esc(nameOf(p)) + "</div>" +
          '<div class="pmeta">' + esc(months) + " " + esc(t.month) + "</div>" +
          priceHtml +
          '<span class="pbtn">' + esc(t.details) + "</span></a>";
      }).join("");

      grid.querySelectorAll("img[data-img]").forEach(function (im) {
        im.addEventListener("error", function () { im.replaceWith(document.createTextNode(im.alt)); });
      });
    } catch (e) {
      grid.innerHTML = '<div class="empty">' + esc(t.err) + "<br><small>" + esc(String((e && e.message) || e)) + "</small></div>";
    }
  }

  grid.innerHTML = new Array(8).join("|").split("|").map(function () {
    return '<div class="sk"><i class="a"></i><i class="b"></i><i class="c"></i></div>';
  }).join("");
  grid.className = "pgrid";
  DBApi.swr("/api/products", function (d) {
    if (!d) { grid.className = "grid"; grid.innerHTML = '<div class="empty">' + esc(t.err) + "</div>"; return; }
    render(d);
  });
})();

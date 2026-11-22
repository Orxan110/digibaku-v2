/* DigiBaku — məhsul səhifəsində "Oxşar məhsullar": ana səhifədəki kartlarla eyni görünüş (şəkil, ad, qiymət) */
(function () {
  var box = document.getElementById("similarBox");
  var slug = new URLSearchParams(location.search).get("slug") || "";
  if (!box || !slug) return;

  var lang = (window.DB && DB.lang) || "az";
  var TX = {
    az: { title: "Oxşar məhsullar", from: "başlanğıc", month: "ay", details: "Ətraflı bax", sale: "Endirim" },
    ru: { title: "Похожие товары", from: "от", month: "мес.", details: "Подробнее", sale: "Скидка" },
    en: { title: "Similar products", from: "from", month: "mo", details: "View details", sale: "Sale" }
  };
  var t = TX[lang] || TX.az;
  var MAX = 4;

  var css = ".sim-wrap{margin:28px 0}" +
    ".sim-wrap h2{font-size:20px;margin-bottom:14px}" +
    ".pgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}" +
    "@media(min-width:900px){.pgrid{grid-template-columns:repeat(4,1fr);gap:16px}}" +
    ".pcard{display:flex;flex-direction:column;background:var(--card);border:1px solid var(--line);border-radius:18px;padding:10px;color:var(--text);transition:border-color .2s;position:relative}" +
    ".pcard:hover{border-color:var(--gold)}" +
    ".pbadge{position:absolute;top:18px;right:18px;z-index:2;background:var(--gold);color:#000;font-size:11px;font-weight:700;border-radius:999px;padding:3px 8px}" +
    ".pimg{width:100%;aspect-ratio:1/1;border-radius:14px;background:var(--card2);border:1px solid var(--line);overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:13px;color:var(--muted);text-align:center;padding:0}" +
    ".pimg img{width:100%;height:100%;object-fit:cover}" +
    ".pname{font-size:15px;font-weight:600;margin:12px 4px 6px;line-height:1.35}" +
    ".pmeta{font-size:12px;color:var(--muted);margin:0 4px 10px}" +
    ".pprice{color:var(--gold);font-size:18px;font-weight:700;margin:0 4px}" +
    ".pprice small{color:var(--muted);font-size:12px;font-weight:400;margin-right:4px}" +
    ".pold{color:var(--muted);font-size:13px;text-decoration:line-through;margin-right:6px}" +
    ".pbtn{margin:12px 4px 4px;display:block;text-align:center;border:1px solid var(--line);background:var(--card2);border-radius:12px;padding:10px;font-size:14px}";
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function nameOf(p) { return (p.name && (p.name[lang] || p.name.az)) || ""; }

  function render(data) {
    var all = (data.products || []).filter(function (p) { return p.prices && p.prices.length; });
    var cur = all.filter(function (p) { return p.slug === slug; })[0];
    if (!cur) return;
    var others = all.filter(function (p) { return p.slug !== slug; });
    var same = others.filter(function (p) { return p.category_key && p.category_key === cur.category_key; });
    var rest = others.filter(function (p) { return same.indexOf(p) < 0; });
    var list = same.concat(rest).slice(0, MAX);
    if (!list.length) { box.innerHTML = ""; return; }

    box.innerHTML = '<div class="sim-wrap"><h2>' + esc(t.title) + '</h2><div class="pgrid">' + list.map(function (p) {
      var prices = p.prices.slice().sort(function (a, b) { return a.months - b.months; });
      var best = prices.reduce(function (a, b) { return b.price < a.price ? b : a; }, prices[0]);
      var hasSale = prices.some(function (x) { return x.old; });
      var months = prices.map(function (x) { return x.months; }).join(" · ");
      var img = p.image_url
        ? '<img src="' + esc(p.image_url) + '" alt="' + esc(nameOf(p)) + '" width="400" height="400" loading="lazy" decoding="async" data-img>'
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
    }).join("") + "</div></div>";

    box.querySelectorAll("img[data-img]").forEach(function (im) {
      im.addEventListener("error", function () { im.replaceWith(document.createTextNode(im.alt)); });
    });
  }

  DBApi.swr("/api/products", function (d) { if (d) render(d); });
})();

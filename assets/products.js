(function () {
  var lang = DB.lang;
  var grid = document.getElementById("productGrid");
  var bar = document.getElementById("catBar");

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function label(o) { return o["name_" + lang] || o.name_az || o.name || ""; }
  function nameOf(p) { return (p.name && (p.name[lang] || p.name.az)) || ""; }
  function showErr(e) {
    grid.innerHTML = '<div class="empty">Xəta: ' + esc(String((e && e.message) || e)) + "</div>";
  }

  async function init() {
    try {
      var params = new URLSearchParams(location.search);
      var cat = params.get("cat") || "";
      var q = (params.get("q") || "").toLowerCase();

      var r = await DBApi.get("/api/products");
      if (!r.ok) {
        grid.innerHTML = '<div class="empty">Məhsullar yüklənmədi.</div>';
        return;
      }
      var cats = r.data.categories || [];
      var items = r.data.products || [];

      bar.innerHTML = '<a class="btn ' + (!cat ? "gold" : "") + '" href="products.html">Hamısı</a>' +
        cats.map(function (c) {
          return '<a class="btn ' + (cat === c.key ? "gold" : "") + '" href="products.html?cat=' +
            encodeURIComponent(c.key) + '">' + esc(label(c)) + "</a>";
        }).join("");

      var catName = {};
      cats.forEach(function (c) { catName[c.key] = label(c); });

      var list = items.filter(function (p) {
        if (cat && p.category_key !== cat) return false;
        if (q) {
          var hay = [p.name.az, p.name.ru, p.name.en].join(" ").toLowerCase();
          if (hay.indexOf(q) < 0) return false;
        }
        return true;
      });

      if (!list.length) {
        grid.innerHTML = '<div class="empty">' + esc(DB.t("empty")) + "</div>";
        return;
      }

      grid.innerHTML = list.map(function (p) {
        var min = Math.min.apply(null, p.prices.map(function (x) { return x.price; }));
        var img = p.image_url
          ? '<img src="' + esc(p.image_url) + '" alt="' + esc(nameOf(p)) + '" loading="lazy" data-img>'
          : esc(nameOf(p));
        return '<div class="card"><div class="img">' + img + '</div><div class="body">' +
          '<span class="cat-label">' + esc(catName[p.category_key] || "") + "</span>" +
          "<h3>" + esc(nameOf(p)) + "</h3>" +
          '<span class="price">' + esc(DB.t("from")) + " " + min.toFixed(2) + " AZN</span>" +
          '<div class="actions"><a class="btn" href="product.html?slug=' + encodeURIComponent(p.slug) + '">' +
          esc(DB.t("details")) + "</a></div></div></div>";
      }).join("");

      grid.querySelectorAll("img[data-img]").forEach(function (im) {
        im.addEventListener("error", function () {
          im.replaceWith(document.createTextNode(im.alt));
        });
      });
    } catch (e) {
      showErr(e);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();

/* DigiBaku — profil səhifəsini kateqoriyalara bölür: Hesab, Balans, Sifarişlər, Sevimlilər, Bildirişlər */
(function () {
  var CATS = [
    { key: "hesab", label: "Hesab" },
    { key: "balans", label: "Balans" },
    { key: "kesbek", label: "Keşbek" },
    { key: "sifaris", label: "Sifarişlər" },
    { key: "sevimli", label: "Sevimlilər" },
    { key: "bildiris", label: "Bildirişlər" }
  ];
  // Kənardan gələn bölmələrin id-ləri və hansı kateqoriyaya aid olduğu
  var PLACE = { wishSection: "sevimli", balSection: "balans", cashSection: "kesbek", expSection: "bildiris" };

  var style = document.createElement("style");
  style.textContent =
    ".pcat-tabs{display:flex;gap:8px;overflow-x:auto;margin:4px 0 16px;padding-bottom:4px}" +
    ".ptab{padding:8px 14px;border-radius:999px;border:1px solid var(--line);background:transparent;color:inherit;" +
    "white-space:nowrap;font-size:14px;cursor:pointer}" +
    ".ptab.on{background:#d4af37;color:#000;border-color:#d4af37;font-weight:600}" +
    ".ppanel{display:none}.ppanel.on{display:block}" +
    ".ppanel .psec{margin:0 0 14px !important;padding-top:0 !important;border-top:none !important}";
  document.head.appendChild(style);

  function panelOf(wrap, key) { return wrap.querySelector('.ppanel[data-cat="' + key + '"]'); }

  function show(wrap, key) {
    wrap.querySelectorAll(".ptab").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-cat") === key); });
    wrap.querySelectorAll(".ppanel").forEach(function (p) { p.classList.toggle("on", p.getAttribute("data-cat") === key); });
  }

  function build(box) {
    var wrap = document.createElement("div");
    wrap.id = "pcat";
    var tabs = document.createElement("div");
    tabs.className = "pcat-tabs";
    CATS.forEach(function (c) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "ptab";
      b.setAttribute("data-cat", c.key);
      b.textContent = c.label;
      b.onclick = function () { show(wrap, c.key); };
      tabs.appendChild(b);
    });
    wrap.appendChild(tabs);
    CATS.forEach(function (c) {
      var p = document.createElement("div");
      p.className = "ppanel";
      p.setAttribute("data-cat", c.key);
      wrap.appendChild(p);
    });
    // Mövcud məzmunun hamısı "Hesab" kateqoriyasına keçir (sonra müvafiq yerə köçürülür)
    var hesab = panelOf(wrap, "hesab");
    Array.prototype.slice.call(box.children).forEach(function (el) {
      if (PLACE[el.id]) return;
      hesab.appendChild(el);
    });
    box.appendChild(wrap);
    // profile.html#balans kimi keçidlə uyğun kateqoriya açılır
    var h = (location.hash || "").replace("#", "");
    var start = CATS.some(function (c) { return c.key === h; }) ? h : "hesab";
    show(wrap, start);
  }

  function sweep(wrap) {
    // Sifarişlər düyməsi (orders.html linki) ayrı kateqoriyaya keçir
    var orders = null;
    panelOf(wrap, "hesab").querySelectorAll("a").forEach(function (a) {
      if ((a.getAttribute("href") || "").indexOf("orders.html") !== -1) orders = a;
    });
    if (orders) panelOf(wrap, "sifaris").appendChild(orders);

    // Kənardan əlavə olunan bölmələri (sevimli, balans, bildiriş) öz kateqoriyasına köçür
    Object.keys(PLACE).forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var target = panelOf(wrap, PLACE[id]);
      if (el.parentNode !== target) target.appendChild(el);
    });
  }

  setInterval(function () {
    var box = document.getElementById("profileBox");
    if (!box || !document.getElementById("logoutBtn")) return;
    var wrap = document.getElementById("pcat");
    if (!wrap) { build(box); wrap = document.getElementById("pcat"); }
    if (wrap) sweep(wrap);
  }, 500);
})();

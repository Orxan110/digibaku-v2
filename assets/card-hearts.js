/* DigiBaku — məhsul kartlarında sevimli ürəyi (sol tərəf, kiçik) */
(function () {
  var lang = (window.DB && DB.lang) || "az";
  var LOGIN = { az: "Sevimlilər üçün daxil olun", ru: "Войдите, чтобы сохранять в избранное", en: "Log in to save to wishlist" };
  var ERR = { az: "Xəta baş verdi. Yenidən cəhd edin.", ru: "Ошибка. Попробуйте ещё раз.", en: "Something went wrong. Try again." };
  var t = { login: LOGIN[lang] || LOGIN.az, err: ERR[lang] || ERR.az };

  var style = document.createElement("style");
  style.textContent =
    ".pheart{position:absolute;left:14px;top:14px;width:34px;height:34px;border-radius:50%;" +
    "border:1px solid rgba(255,255,255,.25);background:rgba(0,0,0,.6);color:#fff;font-size:18px;" +
    "display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:3;padding:0;line-height:1}" +
    ".pheart.on{color:var(--gold,#d4af37);border-color:var(--gold,#d4af37)}";
  document.head.appendChild(style);

  async function call(method, body) {
    var h = {};
    try {
      if (window.DigiAuth && DigiAuth.getToken) {
        var tk = await DigiAuth.getToken();
        if (tk) h.Authorization = "Bearer " + tk;
      }
    } catch (e) {}
    if (body) h["Content-Type"] = "application/json";
    try {
      var r = await fetch("/api/shop?action=wish", {
        method: method, credentials: "include", headers: h,
        body: body ? JSON.stringify(body) : undefined
      });
      var data = await r.json().catch(function () { return {}; });
      return { ok: r.ok, status: r.status, data: data };
    } catch (e) { return { ok: false, status: 0, data: {} }; }
  }

  var PRODUCTS = null, KEYS = null;
  async function products() {
    if (PRODUCTS) return PRODUCTS;
    var r = await DBApi.get("/api/products");
    PRODUCTS = (r.ok && r.data && r.data.products) || [];
    return PRODUCTS;
  }

  async function loadKeys() {
    var st = await call("GET");
    KEYS = (st.ok && st.data.keys) || [];
    return st.status;
  }

  function paint(btn, on) {
    btn.textContent = on ? "♥" : "♡";
    btn.classList.toggle("on", on);
    btn.setAttribute("aria-label", on ? "Sevimlidə" : "Sevimlilərə əlavə et");
  }

  async function attach(card, p) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pheart";
    card.setAttribute("data-hearted", "1");
    card.appendChild(btn);
    paint(btn, KEYS.indexOf(p.product_key) !== -1);

    btn.addEventListener("click", async function (e) {
      // Kart bir link olduğu üçün məhsul səhifəsinə keçidi dayandırırıq
      e.preventDefault();
      e.stopPropagation();
      if (btn.disabled) return;
      var on = btn.classList.contains("on");
      btn.disabled = true;
      var r = await call("POST", { product_key: p.product_key, on: !on });
      btn.disabled = false;
      if (r.status === 401) {
        alert(t.login);
        location.href = "login.html?next=" + encodeURIComponent(location.pathname.replace(/^\//, "") + location.search);
        return;
      }
      if (!r.ok) { alert(t.err); return; }
      if (!on) { KEYS.push(p.product_key); } else { KEYS = KEYS.filter(function (k) { return k !== p.product_key; }); }
      paint(btn, !on);
    });
  }

  var busy = false, loaded = false;
  setInterval(async function () {
    var cards = document.querySelectorAll('a.pcard[href*="slug="]:not([data-hearted])');
    if (!cards.length || busy) return;
    busy = true;
    try {
      var list = await products();
      if (!loaded) { await loadKeys(); loaded = true; }
      cards.forEach(function (card) {
        var m = /slug=([^&]+)/.exec(card.getAttribute("href") || "");
        if (!m) return;
        var slug = decodeURIComponent(m[1]);
        var p = list.filter(function (x) { return x.slug === slug; })[0];
        if (p && !card.hasAttribute("data-hearted")) attach(card, p);
      });
    } finally { busy = false; }
  }, 500);
})();

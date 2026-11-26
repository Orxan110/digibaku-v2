/* DigiBaku — sevimlilər: məhsul səhifəsində ♥ düyməsi və profildə siyahı */
(function () {
  var lang = (window.DB && DB.lang) || "az";
  var TX = {
    az: { add: "Sevimlilərə əlavə et", on: "Sevimlilərdədir", login: "Sevimlilər üçün daxil olun",
      wish: "Sevimlilərim", empty: "Sevimli məhsulunuz yoxdur.", remove: "Sil", err: "Xəta baş verdi. Yenidən cəhd edin." },
    ru: { add: "В избранное", on: "В избранном", login: "Войдите, чтобы сохранять в избранное",
      wish: "Избранное", empty: "В избранном пока пусто.", remove: "Удалить", err: "Ошибка. Попробуйте ещё раз." },
    en: { add: "Add to wishlist", on: "In wishlist", login: "Log in to save to wishlist",
      wish: "My wishlist", empty: "Your wishlist is empty.", remove: "Remove", err: "Something went wrong. Try again." }
  };
  var t = TX[lang] || TX.az;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // Giriş tokeni ilə sorğu (sifariş sorğuları kimi). 401 halında null qaytarır.
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
    } catch (e) {
      return { ok: false, status: 0, data: {} };
    }
  }

  function loginUrl() {
    return "login.html?next=" + encodeURIComponent(location.pathname.replace(/^\//, "") + location.search);
  }

  // Məhsul siyahısını slug/açar üzrə tapmaq üçün (sayt keşi ilə)
  var PRODUCTS = null;
  async function products() {
    if (PRODUCTS) return PRODUCTS;
    var r = await DBApi.get("/api/products");
    PRODUCTS = (r.ok && r.data && r.data.products) || [];
    return PRODUCTS;
  }

  function nameOf(p) { return (p.name && (p.name[lang] || p.name.az)) || p.product_key; }

  /* ---------- Məhsul səhifəsi: ♥ düyməsi ---------- */
  function initProductButton() {
    var slug = new URLSearchParams(location.search).get("slug");
    if (!slug) return;
    var busy = false, p = null;
    // Səhifə yenidən çəkiləndə (məs. müddət dəyişəndə) düymə yenidən əlavə olunur
    setInterval(async function () {
      var anchor = document.getElementById("addCartBtn");
      if (!anchor || document.getElementById("wishBtn") || busy) return;
      busy = true;
      if (!p) {
        var list = await products();
        p = list.filter(function (x) { return x.slug === slug; })[0] || null;
      }
      if (p && !document.getElementById("wishBtn") && document.getElementById("addCartBtn")) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.id = "wishBtn";
        btn.className = "btn btn-out btn-block";
        btn.style.marginTop = "8px";
        document.getElementById("addCartBtn").parentNode.insertBefore(btn, document.getElementById("addCartBtn").nextSibling);
        paint(btn, false);
        var st = await call("GET");
        var on = !!(st.ok && st.data.keys && st.data.keys.indexOf(p.product_key) !== -1);
        paint(btn, on);
        btn.onclick = async function () {
          btn.disabled = true;
          var r = await call("POST", { product_key: p.product_key, on: !on });
          btn.disabled = false;
          if (r.status === 401) { location.href = loginUrl(); return; }
          if (!r.ok) { alert(t.err); return; }
          on = !on;
          paint(btn, on);
        };
      }
      busy = false;
    }, 500);
  }

  function paint(btn, on) {
    btn.textContent = (on ? "♥ " : "♡ ") + (on ? t.on : t.add);
  }

  /* ---------- Profil: sevimlilər siyahısı ---------- */
  async function renderProfileWishlist(box) {
    var sec = document.createElement("div");
    sec.id = "wishSection";
    sec.style.cssText = "border-top:1px solid var(--line);padding-top:16px;margin-top:16px";
    sec.innerHTML = '<h2 style="font-size:17px;margin-bottom:12px">' + esc(t.wish) + "</h2><div id=\"wishList\"></div>";
    box.appendChild(sec);
    var listBox = document.getElementById("wishList");

    var st = await call("GET");
    if (st.status === 401) { listBox.innerHTML = '<p class="muted"><a href="' + loginUrl() + '">' + esc(t.login) + "</a></p>"; return; }
    var keys = (st.ok && st.data.keys) || [];
    var all = await products();
    var items = all.filter(function (p) { return keys.indexOf(p.product_key) !== -1; });
    if (!items.length) { listBox.innerHTML = '<p class="muted">' + esc(t.empty) + "</p>"; return; }
    listBox.innerHTML = items.map(function (p) {
      return '<div class="card-box" style="margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;gap:8px">' +
        '<a href="product.html?slug=' + encodeURIComponent(p.slug) + '">' + esc(nameOf(p)) + "</a>" +
        '<button type="button" class="btn" data-wrm="' + esc(p.product_key) + '">' + esc(t.remove) + "</button></div>";
    }).join("");
    listBox.onclick = async function (e) {
      var k = e.target.getAttribute("data-wrm");
      if (!k) return;
      var r = await call("POST", { product_key: k, on: false });
      if (!r.ok) { alert(t.err); return; }
      sec.remove();
      renderProfileWishlist(box);
    };
  }

  function initProfile() {
    var busy = false;
    // Profil yenidən çəkiləndə bölmə yenidən əlavə olunur
    setInterval(function () {
      var box = document.getElementById("profileBox");
      if (!box || !document.getElementById("logoutBtn") || document.getElementById("wishSection") || busy) return;
      busy = true;
      renderProfileWishlist(box).then(function () { busy = false; }, function () { busy = false; });
    }, 500);
  }

  initProductButton();
  initProfile();
})();

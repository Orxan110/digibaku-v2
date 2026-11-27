/* DigiBaku — sevimlilər: məhsul səhifəsində ♥ düyməsi və profildə siyahı */
(function () {
  var lang = (window.DB && DB.lang) || "az";
  var TX = {
    az: { add: "Sevimlilərə əlavə et", on: "Sevimlilərdədir", login: "Sevimlilər üçün daxil olun",
      wish: "Sevimlilərim", empty: "Sevimli məhsulunuz yoxdur.", remove: "Sil", err: "Xəta baş verdi. Yenidən cəhd edin.",
      notif: "Bildirişlər", noNotif: "Hazırda bitməyə yaxın abunəniz yoxdur.", ends: "Bitmə tarixi", days: "gün qalıb", renew: "Yenidən sifariş ver" },
    ru: { add: "В избранное", on: "В избранном", login: "Войдите, чтобы сохранять в избранное",
      wish: "Избранное", empty: "В избранном пока пусто.", remove: "Удалить", err: "Ошибка. Попробуйте ещё раз.",
      notif: "Уведомления", noNotif: "Скоро заканчивающихся подписок нет.", ends: "Дата окончания", days: "дн. осталось", renew: "Заказать снова" },
    en: { add: "Add to wishlist", on: "In wishlist", login: "Log in to save to wishlist",
      wish: "My wishlist", empty: "Your wishlist is empty.", remove: "Remove", err: "Something went wrong. Try again.",
      notif: "Notifications", noNotif: "No subscriptions ending soon.", ends: "Ends on", days: "days left", renew: "Order again" }
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
      // Ürək alt paneldə (səbət ikonunun yanında) göstərilir, həmişə görünür
      var anchor = document.getElementById("stickyCart") || document.getElementById("addCartBtn");
      if (!anchor || document.getElementById("wishBtn") || busy) return;
      busy = true;
      if (!p) {
        var list = await products();
        p = list.filter(function (x) { return x.slug === slug; })[0] || null;
      }
      var anc = document.getElementById("stickyCart") || document.getElementById("addCartBtn");
      if (p && !document.getElementById("wishBtn") && anc) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.id = "wishBtn";
        if (document.getElementById("stickyCart")) {
          // Alt paneldə: səbət ikonu ilə eyni kiçik üslub
          btn.className = "btn btn-out cart-ico";
          btn.setAttribute("aria-label", t.add);
          btn.title = t.add;
          anc.parentNode.insertBefore(btn, anc);
        } else {
          btn.className = "btn btn-out btn-block";
          btn.style.marginTop = "8px";
          anc.parentNode.insertBefore(btn, anc.nextSibling);
        }
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
    if (btn.classList.contains("cart-ico")) {
      // İkon: boş ♡ və ya qırmızı ♥
      btn.textContent = on ? "♥" : "♡";
      btn.style.color = on ? "#e11d48" : "";
      btn.style.borderColor = on ? "#e11d48" : "";
      btn.style.fontSize = "20px";
      return;
    }
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

  // Bitməyə yaxın abunələr (sayt içində bildiriş)
  async function renderExpiring(box) {
    var sec = document.createElement("div");
    sec.id = "expSection";
    sec.style.cssText = "border-top:1px solid var(--line);padding-top:16px;margin-top:16px";
    sec.innerHTML = '<h2 style="font-size:17px;margin-bottom:12px">' + esc(t.notif) + '</h2><div id="expList"></div>';
    box.appendChild(sec);
    var listBox = document.getElementById("expList");
    var h = {};
    try {
      if (window.DigiAuth && DigiAuth.getToken) {
        var tk = await DigiAuth.getToken();
        if (tk) h.Authorization = "Bearer " + tk;
      }
    } catch (e) {}
    var r;
    try {
      r = await fetch("/api/shop?action=expiring", { credentials: "include", headers: h });
    } catch (e) { r = null; }
    var data = r && r.ok ? await r.json().catch(function () { return {}; }) : {};
    var items = (data && data.items) || [];
    if (!items.length) { listBox.innerHTML = '<p class="muted">' + esc(t.noNotif) + "</p>"; return; }
    listBox.innerHTML = items.map(function (x) {
      var left = Math.max(0, Math.ceil((new Date(x.ends_at).getTime() - Date.now()) / 86400000));
      var when = new Date(x.ends_at).toLocaleDateString("az-AZ");
      return '<div class="card-box" style="margin-bottom:8px"><b>' + esc(x.name || "") + "</b>" +
        '<p class="muted" style="font-size:13px;margin:4px 0">' + esc(t.ends) + ": " + esc(when) +
        " · " + left + " " + esc(t.days) + "</p>" +
        '<a class="btn" href="products.html">' + esc(t.renew) + "</a></div>";
    }).join("");
  }

  function initProfile() {
    var busyW = false, busyE = false;
    // Profil yenidən çəkiləndə bölmələr yenidən əlavə olunur
    setInterval(function () {
      var box = document.getElementById("profileBox");
      if (!box || !document.getElementById("logoutBtn")) return;
      if (!document.getElementById("wishSection") && !busyW) {
        busyW = true;
        renderProfileWishlist(box).then(function () { busyW = false; }, function () { busyW = false; });
      }
      if (!document.getElementById("expSection") && !busyE) {
        busyE = true;
        renderExpiring(box).then(function () { busyE = false; }, function () { busyE = false; });
      }
    }, 500);
  }

  initProductButton();
  initProfile();
})();

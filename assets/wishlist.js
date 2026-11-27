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

  /* ---------- Məhsul səhifəsi: şəklin sol yuxarısında ♥ düyməsi ---------- */
  var st0 = document.createElement("style");
  st0.textContent =
    ".pd-img{position:relative}" +
    ".pd-wish{position:absolute;left:12px;top:12px;width:48px;height:48px;border-radius:50%;" +
    "border:1px solid rgba(255,255,255,.35);background:rgba(0,0,0,.6);color:#fff;font-size:28px;" +
    "display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:4;padding:0;line-height:1}" +
    ".pd-wish.on{color:#e11d48;border-color:#e11d48}";
  document.head.appendChild(st0);

  function initProductButton() {
    var slug = new URLSearchParams(location.search).get("slug");
    if (!slug) return;
    var busy = false, p = null;
    // Səhifə yenidən çəkiləndə düymə yenidən əlavə olunur
    setInterval(async function () {
      var img = document.querySelector(".pd-img");
      if (!img || document.getElementById("wishBtn") || busy) return;
      busy = true;
      try {
        if (!p) {
          var list = await products();
          p = list.filter(function (x) { return x.slug === slug; })[0] || null;
        }
        var target = document.querySelector(".pd-img");
        if (p && target && !document.getElementById("wishBtn")) {
          var btn = document.createElement("button");
          btn.type = "button";
          btn.id = "wishBtn";
          btn.className = "pd-wish";
          btn.setAttribute("aria-label", t.add);
          btn.title = t.add;
          target.appendChild(btn);
          paint(btn, false);
          var st = await call("GET");
          var on = !!(st.ok && st.data.keys && st.data.keys.indexOf(p.product_key) !== -1);
          paint(btn, on);
          btn.onclick = async function (e) {
            e.stopPropagation();
            btn.disabled = true;
            var r = await call("POST", { product_key: p.product_key, on: !on });
            btn.disabled = false;
            if (r.status === 401) { location.href = loginUrl(); return; }
            if (!r.ok) { alert(t.err); return; }
            on = !on;
            paint(btn, on);
          };
        }
      } finally {
        busy = false;
      }
    }, 500);
  }

  // Düymə yalnız ürək ikonudur: boş ♡ və ya qırmızı ♥
  function paint(btn, on) {
    btn.textContent = on ? "♥" : "♡";
    btn.classList.toggle("on", on);
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

  // ===== Balans və Keşbek bölmələri (3 dildə; qaydalar admin paneldən gəlir) =====
  var BT = {
    az: {
      balTitle: "Balansınız", topTitle: "Balansı necə artırmaq olar", topBtn: "WhatsApp ilə balans artır",
      hist: "Balans tarixçəsi", noOps: "Hələ əməliyyat yoxdur.", note: "Keşbek qazanır və balansınızla sifariş ödəyə bilərsiniz.",
      fail: "Məlumat yüklənmədi.", retry: "Yenidən cəhd et", wa: "Salam, balansımı artırmaq istəyirəm.",
      cashTitle: "Keşbek", cashPct: "keşbek", cashSub: "Hər uğurlu sifarişdən balansınıza qayıdır.", rulesTitle: "Keşbek qaydaları",
      topDef: [
        "Balansı artırmaq üçün WhatsApp vasitəsilə bizimlə əlaqə saxlayın.",
        "Ödənişi etdikdən sonra çeki (skrin) və hesabınızın e-poçtunu göndərin.",
        "Ödəniş yoxlanıldıqdan sonra məbləğ balansınıza əlavə olunur."
      ],
      cashDef: function (p) { return [
        "Hər ödənilmiş sifarişdən " + p + "% keşbek balansınıza əlavə olunur.",
        "Keşbek sifariş \"Ödənilib\" və ya \"Təhvil verildi\" statusuna keçəndə hesablanır.",
        "Hər sifariş üçün keşbek yalnız bir dəfə hesablanır.",
        "Balansınızı növbəti sifarişlərdə ödəniş üçün istifadə edə bilərsiniz."
      ]; }
    },
    ru: {
      balTitle: "Ваш баланс", topTitle: "Как пополнить баланс", topBtn: "Пополнить через WhatsApp",
      hist: "История баланса", noOps: "Операций пока нет.", note: "Вы получаете кешбэк и можете оплачивать заказы балансом.",
      fail: "Не удалось загрузить данные.", retry: "Повторить", wa: "Здравствуйте, хочу пополнить баланс.",
      cashTitle: "Кешбэк", cashPct: "кешбэк", cashSub: "С каждого успешного заказа часть суммы возвращается на баланс.", rulesTitle: "Правила кешбэка",
      topDef: [
        "Чтобы пополнить баланс, свяжитесь с нами через WhatsApp.",
        "После оплаты отправьте чек (скриншот) и e-mail вашего аккаунта.",
        "После проверки платежа сумма будет зачислена на ваш баланс."
      ],
      cashDef: function (p) { return [
        "С каждого оплаченного заказа " + p + "% кешбэка зачисляется на ваш баланс.",
        "Кешбэк начисляется, когда заказ получает статус «Оплачен» или «Выдан».",
        "Кешбэк за каждый заказ начисляется только один раз.",
        "Баланс можно использовать для оплаты следующих заказов."
      ]; }
    },
    en: {
      balTitle: "Your balance", topTitle: "How to top up your balance", topBtn: "Top up via WhatsApp",
      hist: "Balance history", noOps: "No transactions yet.", note: "You earn cashback and can pay for orders with your balance.",
      fail: "Could not load the data.", retry: "Try again", wa: "Hello, I would like to top up my balance.",
      cashTitle: "Cashback", cashPct: "cashback", cashSub: "A part of every successful order returns to your balance.", rulesTitle: "Cashback rules",
      topDef: [
        "To top up your balance, contact us on WhatsApp.",
        "After paying, send the receipt (screenshot) and your account e-mail.",
        "Once the payment is verified, the amount is added to your balance."
      ],
      cashDef: function (p) { return [
        p + "% cashback is added to your balance from every paid order.",
        "Cashback is credited when the order status becomes \"Paid\" or \"Delivered\".",
        "Cashback is credited only once per order.",
        "You can use your balance to pay for future orders."
      ]; }
    }
  };
  var bt = BT[lang] || BT.az;

  function lines(txt) {
    return String(txt || "").split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean);
  }
  function ul(arr) {
    return '<ul style="margin:8px 0 0;padding-left:18px;font-size:13px;line-height:1.6">' +
      arr.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>";
  }
  function locale() { return lang === "ru" ? "ru-RU" : lang === "en" ? "en-GB" : "az-AZ"; }

  // Qaydalar hamı üçün açıq endpoint-dən gəlir (balans yüklənməsə də göstərilir)
  var infoCache = null, infoLoading = null;
  function loadInfo() {
    if (infoCache) return Promise.resolve(infoCache);
    if (infoLoading) return infoLoading;
    infoLoading = (async function () {
      for (var i = 0; i < 3; i++) {
        if (i) await new Promise(function (r) { setTimeout(r, 1200 * i); });
        try {
          var r = await fetch("/api/shop?action=cashback_info", { cache: "no-store" });
          if (r.ok) {
            var d = await r.json().catch(function () { return null; });
            if (d && d.cashback) { infoCache = d.cashback; return infoCache; }
          }
        } catch (e) {}
      }
      return null;
    })();
    infoLoading.then(function () { infoLoading = null; }, function () { infoLoading = null; });
    return infoLoading;
  }
  function pick(cb, base) {
    if (!cb) return [];
    var key = lang === "az" ? base : base + "_" + lang;
    if (base === "rules") key = lang === "az" ? "rules" : "rules_" + lang;
    if (base === "topup") key = "topup_" + lang;
    return lines(cb[key]);
  }

  function makeSection(id, title, box) {
    var sec = document.createElement("div");
    sec.id = id;
    sec.style.cssText = "border-top:1px solid var(--line);padding-top:16px;margin-top:16px";
    sec.innerHTML = '<h2 style="font-size:17px;margin-bottom:12px">' + esc(title) + '</h2><div class="secBody"><p class="muted">...</p></div>';
    box.appendChild(sec);
    return sec;
  }

  // Müştərinin balansı (profil bölməsi)
  async function renderBalance(box) {
    var sec = makeSection("balSection", bt.balTitle, box);
    var out = sec.querySelector(".secBody");
    var state = { bal: window.DigiBalance ? DigiBalance.cached() : null, ledger: null, info: null, failed: false };

    function draw() {
      if (!document.body.contains(sec)) return;
      var cb = state.info;
      var rules = pick(cb, "topup");
      if (!rules.length) rules = bt.topDef;
      var wa = "";
      try { wa = (window.DB && DB.waLink) ? DB.waLink(bt.wa) : ""; } catch (e) {}
      var balTxt = state.bal === null ? "…" : Number(state.bal).toFixed(2) + " AZN";
      var led = "";
      if (state.ledger) {
        led = state.ledger.map(function (x) {
          var pos = Number(x.amount) >= 0;
          return '<div style="border-top:1px solid #262626;padding:8px 0;font-size:13px;display:flex;justify-content:space-between;gap:8px">' +
            '<div>' + esc(x.reason || "—") + '<div class="muted" style="font-size:12px">' + esc(new Date(x.created_at).toLocaleString(locale())) + "</div></div>" +
            '<b style="color:' + (pos ? "#4ade80" : "#f87171") + ';white-space:nowrap">' + (pos ? "+" : "") + Number(x.amount).toFixed(2) + " AZN</b></div>";
        }).join("");
      }
      var err = (state.failed && state.bal === null)
        ? '<p class="muted" style="font-size:13px;margin:8px 0">' + esc(bt.fail) + ' <button class="btn" type="button" data-balretry="1">' + esc(bt.retry) + "</button></p>" : "";
      out.innerHTML =
        '<div class="card-box"><b class="price" style="font-size:22px">' + esc(balTxt) + "</b>" + err +
        '<p class="muted" style="font-size:13px;margin-top:6px">' + esc(bt.note) + "</p></div>" +
        '<div class="card-box" style="margin-top:8px"><b style="font-size:14px">' + esc(bt.topTitle) + "</b>" + ul(rules) +
        (wa ? '<p style="margin:12px 0 0"><a class="btn gold" target="_blank" rel="noopener" href="' + esc(wa) + '">' + esc(bt.topBtn) + "</a></p>" : "") + "</div>" +
        '<div class="card-box" style="margin-top:8px"><b style="font-size:14px">' + esc(bt.hist) + "</b>" +
        (state.ledger === null ? '<p class="muted" style="font-size:13px;margin-top:6px">...</p>'
          : (led || '<p class="muted" style="font-size:13px;margin-top:6px">' + esc(bt.noOps) + "</p>")) + "</div>";
    }

    function applyData(d) {
      if (!d) return;
      state.bal = Number(d.balance || 0);
      state.ledger = d.ledger || [];
      if (d.cashback && !infoCache) { infoCache = d.cashback; }
      if (infoCache) state.info = infoCache;
      state.failed = false;
      draw();
    }
    function fetchAll() {
      state.failed = false; draw();
      loadInfo().then(function (c) { if (c) { state.info = c; draw(); } });
      if (window.DigiBalance) {
        DigiBalance.refresh().then(function (d) {
          if (d && d.ledger) applyData(d); else { state.failed = true; draw(); }
        });
      }
    }
    out.addEventListener("click", function (e) {
      if (e.target && e.target.getAttribute && e.target.getAttribute("data-balretry")) fetchAll();
    });
    if (window.DigiBalance) {
      if (DigiBalance.data()) applyData(DigiBalance.data());
      DigiBalance.on(function (d) { if (document.body.contains(sec)) applyData(d); });
    }
    draw();
    fetchAll();
  }

  // Keşbek bölməsi: faiz və qaydaları admin paneldən gəlir (3 dildə)
  async function renderCashback(box) {
    var sec = makeSection("cashSection", bt.cashTitle, box);
    var out = sec.querySelector(".secBody");
    function draw(cb) {
      if (!document.body.contains(sec)) return;
      if (!cb) {
        out.innerHTML = '<div class="card-box"><p class="muted">' + esc(bt.fail) + '</p><button class="btn" type="button" data-cashretry="1">' + esc(bt.retry) + "</button></div>";
        return;
      }
      var pct = Number(cb.percent || 0);
      var pctTxt = String(pct % 1 === 0 ? pct : pct.toFixed(2));
      var rules = pick(cb, "rules");
      if (!rules.length) rules = bt.cashDef(pctTxt);
      out.innerHTML = '<div class="card-box"><b class="price" style="font-size:20px">' + esc(pctTxt) + "% " + esc(bt.cashPct) + "</b>" +
        '<p class="muted" style="font-size:13px;margin-top:6px">' + esc(bt.cashSub) + "</p></div>" +
        '<div class="card-box" style="margin-top:8px"><b style="font-size:14px">' + esc(bt.rulesTitle) + "</b>" + ul(rules) + "</div>";
    }
    function go() { loadInfo().then(draw); }
    out.addEventListener("click", function (e) {
      if (e.target && e.target.getAttribute && e.target.getAttribute("data-cashretry")) { out.innerHTML = '<p class="muted">...</p>'; go(); }
    });
    go();
  }

  function initProfile() {
    var busyW = false, busyE = false, busyB = false, busyC = false;
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
      if (!document.getElementById("balSection") && !busyB) {
        busyB = true;
        renderBalance(box).then(function () { busyB = false; }, function () { busyB = false; });
      }
      if (!document.getElementById("cashSection") && !busyC) {
        busyC = true;
        renderCashback(box).then(function () { busyC = false; }, function () { busyC = false; });
      }
    }, 500);
  }

  initProductButton();
  initProfile();
})();

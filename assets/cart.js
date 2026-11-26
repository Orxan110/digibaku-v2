/* DigiBaku — səbət: miqdar dəyişmə, silmə, promo kod, WhatsApp ilə sifariş (giriş tələb olunmur) və hesabla sifariş */
(async function () {
  var box = document.getElementById("cartBox"), err = document.getElementById("cartErr");
  var lang = (window.DB && DB.lang) || "az";
  var TX = {
    az: { month: "ay", del: "Sil", browse: "Məhsullara bax", nameLbl: "Adınız", namePh: "Ad və soyad",
      phoneLbl: "WhatsApp nömrəniz", phonePh: "+994 50 000 00 00", wa: "WhatsApp-la sifariş et",
      errName: "Ad daxil edin.", errPhone: "Düzgün WhatsApp nömrəsi daxil edin.", noWa: "WhatsApp nömrəsi hələ təyin olunmayıb.",
      intro: "Salam, sifariş vermək istəyirəm.", total: "Ümumi", name: "Ad", phone: "Nömrə", or: "və ya", account: "Sayt üzərindən sifariş et",
      fail: "Sifariş yaradılmadı.",
      cpLbl: "Promo kod", cpPh: "Məs: YENI10", cpBtn: "Tətbiq et", cpClear: "Kuponu ləğv et", cpDisc: "Endirim",
      cpPay: "Ödəniləcək", cpEmpty: "Promo kodu daxil edin.", cpLogin: "Kuponu tətbiq etmək üçün daxil olun.", cpBad: "Kupon etibarsızdır." },
    ru: { month: "мес.", del: "Удалить", browse: "Смотреть товары", nameLbl: "Ваше имя", namePh: "Имя и фамилия",
      phoneLbl: "Ваш номер WhatsApp", phonePh: "+994 50 000 00 00", wa: "Заказать в WhatsApp",
      errName: "Введите имя.", errPhone: "Введите правильный номер WhatsApp.", noWa: "Номер WhatsApp ещё не задан.",
      intro: "Здравствуйте, хочу оформить заказ.", total: "Итого", name: "Имя", phone: "Номер", or: "или", account: "Заказать через сайт",
      fail: "Не удалось оформить заказ.",
      cpLbl: "Промокод", cpPh: "Напр: YENI10", cpBtn: "Применить", cpClear: "Убрать купон", cpDisc: "Скидка",
      cpPay: "К оплате", cpEmpty: "Введите промокод.", cpLogin: "Войдите, чтобы применить купон.", cpBad: "Промокод недействителен." },
    en: { month: "mo", del: "Remove", browse: "Browse products", nameLbl: "Your name", namePh: "Full name",
      phoneLbl: "Your WhatsApp number", phonePh: "+994 50 000 00 00", wa: "Order via WhatsApp",
      errName: "Please enter your name.", errPhone: "Please enter a valid WhatsApp number.", noWa: "WhatsApp number is not set yet.",
      intro: "Hello, I would like to place an order.", total: "Total", name: "Name", phone: "Number", or: "or", account: "Order through website",
      fail: "Order could not be created.",
      cpLbl: "Promo code", cpPh: "e.g. YENI10", cpBtn: "Apply", cpClear: "Remove coupon", cpDisc: "Discount",
      cpPay: "To pay", cpEmpty: "Enter a promo code.", cpLogin: "Log in to apply a coupon.", cpBad: "Invalid coupon." }
  };
  var t = TX[lang] || TX.az;
  var catalog = [];
  var state = { name: "", phone: "", couponCode: "", coupon: null, cpErr: "" };

  function nameOf(p) { return (p.name && (p.name[lang] || p.name.az)) || ""; }
  function validPhone(v) { return /^\+?\d{9,15}$/.test(String(v || "").replace(/[\s\-()]/g, "")); }

  // Səbətdəki sətirlər + cəmi (qiymətlər kataloqdan götürülür)
  function lines() {
    var out = [], total = 0;
    DB.cart.get().forEach(function (i) {
      var p = catalog.find(function (x) { return x.product_key === i.product_key; });
      if (!p) return;
      var pr = p.prices.find(function (x) { return x.months === i.months; });
      if (!pr) return;
      var line = pr.price * i.qty;
      total += line;
      out.push({ i: i, p: p, pr: pr, line: line });
    });
    return { rows: out, total: total };
  }

  function waText(L) {
    var parts = [t.intro, ""];
    L.rows.forEach(function (r) {
      parts.push("• " + nameOf(r.p) + " — " + r.i.months + " " + t.month + " × " + r.i.qty + " = " + r.line.toFixed(2) + " AZN");
    });
    parts.push("", t.total + ": " + L.total.toFixed(2) + " AZN");
    if (state.coupon) {
      parts.push(t.cpDisc + " (" + state.coupon.code + "): −" + state.coupon.discount.toFixed(2) + " AZN",
                 t.cpPay + ": " + state.coupon.total.toFixed(2) + " AZN");
    }
    parts.push(t.name + ": " + state.name.trim(), t.phone + ": " + state.phone.trim());
    return parts.join("\n");
  }

  function orderWa() {
    var L = lines();
    if (!L.rows.length) return;
    var e = document.getElementById("waErr");
    if (!state.name.trim()) { e.textContent = t.errName; return; }
    if (!validPhone(state.phone)) { e.textContent = t.errPhone; return; }
    e.textContent = "";
    var link = DB.waLink(waText(L));
    if (link === "#") { e.textContent = t.noWa; return; }
    window.open(link, "_blank", "noopener");
  }

  // Kuponu serverdə yoxlayır (endirim yalnız serverin hesablamasıdır)
  function previewCoupon(code) {
    var btn = document.getElementById("cpBtn");
    if (btn) btn.disabled = true;
    var items = DB.cart.get().map(function (i) { return { product_key: i.product_key, months: i.months, qty: i.qty }; });
    return DBApi.post("/api/orders", { preview: true, items: items, coupon: code }).then(function (res) {
      if (res.status === 401) { state.coupon = null; state.cpErr = t.cpLogin; }
      else if (!res.ok) { state.coupon = null; state.cpErr = (res.data && res.data.error) || t.cpBad; }
      else {
        state.coupon = { code: res.data.coupon, discount: Number(res.data.discount), total: Number(res.data.total) };
        state.cpErr = "";
      }
      draw();
    });
  }

  function applyCoupon() {
    var code = String(state.couponCode || "").trim().toUpperCase();
    state.couponCode = code;
    if (!code) { state.cpErr = t.cpEmpty; draw(); return; }
    previewCoupon(code);
  }

  function draw() {
    var L = lines();
    if (!DB.cart.get().length || !L.rows.length) {
      box.innerHTML = '<div class="empty">' + DB.t("cartEmpty") + ' <a href="products.html">' + t.browse + "</a></div>";
      return;
    }
    var rows = L.rows.map(function (r) {
      var k = esc(r.i.product_key), m = r.i.months;
      return '<div class="cart-line"><div><b>' + esc(nameOf(r.p)) + '</b><div class="muted">' + m + " " + t.month + " · " + r.pr.price.toFixed(2) + " AZN</div></div>" +
        '<div class="qty"><button data-a="-" data-k="' + k + '" data-m="' + m + '">−</button><span>' + r.i.qty + '</span><button data-a="+" data-k="' + k + '" data-m="' + m + '">+</button>' +
        '<button class="btn ghost" data-a="x" data-k="' + k + '" data-m="' + m + '">' + t.del + "</button></div>" +
        '<div class="price">' + r.line.toFixed(2) + " AZN</div></div>";
    }).join("");

    var inp = "background:var(--card2);border:1px solid var(--line);color:var(--text);border-radius:12px;padding:13px;font-size:16px;outline:none;width:100%";
    var cp = state.coupon;
    var totalHtml = cp
      ? '<p class="muted" style="margin:14px 0 4px">' + DB.t("total") + ": " + L.total.toFixed(2) + " AZN</p>" +
        '<p class="muted" style="margin:4px 0">' + t.cpDisc + " (" + esc(cp.code) + "): −" + cp.discount.toFixed(2) + " AZN</p>" +
        '<p style="margin:8px 0 14px;font-size:18px"><b>' + t.cpPay + ': <span class="price">' + cp.total.toFixed(2) + " AZN</span></b></p>"
      : '<p style="margin:14px 0;font-size:18px"><b>' + DB.t("total") + ': <span class="price">' + L.total.toFixed(2) + " AZN</span></b></p>";

    var couponHtml = '<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px"><label for="cpCode" class="muted" style="font-size:14px">' + t.cpLbl + "</label>" +
      '<div style="display:flex;gap:8px"><input id="cpCode" type="text" autocomplete="off" placeholder="' + esc(t.cpPh) + '" value="' + esc(state.couponCode) + '" style="' + inp + ';flex:1;text-transform:uppercase">' +
      '<button class="btn" id="cpBtn" type="button">' + t.cpBtn + "</button></div>" +
      (cp ? '<button class="btn ghost" id="cpClear" type="button" style="align-self:flex-start">' + t.cpClear + "</button>" : "") +
      '<div class="err" id="cpErr">' + esc(state.cpErr) + "</div></div>";

    box.innerHTML = rows + couponHtml + totalHtml +
      '<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px"><label for="cName" class="muted" style="font-size:14px">' + t.nameLbl + "</label>" +
      '<input id="cName" type="text" placeholder="' + esc(t.namePh) + '" value="' + esc(state.name) + '" style="' + inp + '"></div>' +
      '<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:8px"><label for="cPhone" class="muted" style="font-size:14px">' + t.phoneLbl + "</label>" +
      '<input id="cPhone" type="tel" placeholder="' + esc(t.phonePh) + '" value="' + esc(state.phone) + '" style="' + inp + '"></div>' +
      '<div class="err" id="waErr"></div>' +
      '<button class="btn gold" id="waBtn" style="width:100%;padding:14px">' + t.wa + "</button>" +
      '<p class="muted" style="text-align:center;margin:12px 0;font-size:13px">' + t.or + "</p>" +
      '<button class="btn gold" id="checkoutBtn" style="width:100%;padding:14px">' + t.account + "</button>";

    box.querySelectorAll("[data-a]").forEach(function (b) {
      b.onclick = function () {
        var k = b.dataset.k, m = Number(b.dataset.m), it = DB.cart.get().find(function (x) { return x.product_key === k && x.months === m; });
        if (!it) return;
        if (b.dataset.a === "x") DB.cart.remove(k, m);
        else if (b.dataset.a === "+") DB.cart.setQty(k, m, it.qty + 1);
        else DB.cart.setQty(k, m, it.qty - 1);
      };
    });
    var cpIn = document.getElementById("cpCode");
    cpIn.oninput = function (e) { state.couponCode = e.target.value; };
    cpIn.onkeydown = function (e) { if (e.key === "Enter") { e.preventDefault(); applyCoupon(); } };
    document.getElementById("cpBtn").onclick = applyCoupon;
    var clr = document.getElementById("cpClear");
    if (clr) clr.onclick = function () { state.coupon = null; state.couponCode = ""; state.cpErr = ""; draw(); };
    document.getElementById("cName").oninput = function (e) { state.name = e.target.value; };
    document.getElementById("cPhone").oninput = function (e) { state.phone = e.target.value; };
    document.getElementById("waBtn").onclick = orderWa;
    document.getElementById("checkoutBtn").onclick = checkout;
  }

  async function checkout() {
    err.textContent = "";
    var btn = document.getElementById("checkoutBtn"); btn.disabled = true;
    var res = await DBApi.post("/api/orders", { items: DB.cart.get(), coupon: state.coupon ? state.coupon.code : "" });
    btn.disabled = false;
    if (res.status === 401) { location.href = "login.html?next=cart.html"; return; }
    if (!res.ok) {
      // Kupon səbətdə dəyişibsə (müddət, limit, minimum) endirimi götürüb səbəbi göstəririk
      if (state.coupon) { state.coupon = null; state.cpErr = (res.data && res.data.error) || t.cpBad; draw(); }
      err.textContent = (res.data && res.data.error) || t.fail;
      return;
    }
    DB.cart.save([]);
    location.href = "orders.html?created=1";
  }

  // "cart-changed" hadisəsi (səbət nişanı) da draw-u çağırır; yazı sahələri state-də qorunur.
  // Kupon tətbiq olunubsa, səbət dəyişəndə endirim yenidən hesablanır.
  window.addEventListener("cart-changed", function () {
    if (document.hidden || !catalog.length) return;
    if (state.coupon) previewCoupon(state.coupon.code);
    else draw();
  });

  DBApi.swr("/api/products", function (d) {
    if (d) { catalog = d.products || []; draw(); }
    else if (!catalog.length) { box.innerHTML = '<div class="empty">' + t.fail + "</div>"; }
  });

  if (window.DigiAuth) {
    DigiAuth.getSession().then(function (r) {
      var nm = r && r.session && r.session.user && r.session.user.name;
      var inp = document.getElementById("cName");
      if (nm && !state.name) { state.name = nm; if (inp && !inp.value) inp.value = nm; }
    }).catch(function () {});
  }
})();

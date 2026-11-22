/* DigiBaku — səbət: miqdar dəyişmə, silmə, WhatsApp ilə sifariş (giriş tələb olunmur) və hesabla sifariş */
(async function () {
  var box = document.getElementById("cartBox"), err = document.getElementById("cartErr");
  var lang = (window.DB && DB.lang) || "az";
  var TX = {
    az: { month: "ay", del: "Sil", browse: "Məhsullara bax", nameLbl: "Adınız", namePh: "Ad və soyad",
      phoneLbl: "WhatsApp nömrəniz", phonePh: "+994 50 000 00 00", wa: "WhatsApp-la sifariş et",
      errName: "Ad daxil edin.", errPhone: "Düzgün WhatsApp nömrəsi daxil edin.", noWa: "WhatsApp nömrəsi hələ təyin olunmayıb.",
      intro: "Salam, sifariş vermək istəyirəm.", total: "Ümumi", name: "Ad", phone: "Nömrə", or: "və ya", account: "Hesabla sifariş (giriş tələb olunur)",
      fail: "Sifariş yaradılmadı." },
    ru: { month: "мес.", del: "Удалить", browse: "Смотреть товары", nameLbl: "Ваше имя", namePh: "Имя и фамилия",
      phoneLbl: "Ваш номер WhatsApp", phonePh: "+994 50 000 00 00", wa: "Заказать в WhatsApp",
      errName: "Введите имя.", errPhone: "Введите правильный номер WhatsApp.", noWa: "Номер WhatsApp ещё не задан.",
      intro: "Здравствуйте, хочу оформить заказ.", total: "Итого", name: "Имя", phone: "Номер", or: "или", account: "Заказ через аккаунт (нужен вход)",
      fail: "Не удалось оформить заказ." },
    en: { month: "mo", del: "Remove", browse: "Browse products", nameLbl: "Your name", namePh: "Full name",
      phoneLbl: "Your WhatsApp number", phonePh: "+994 50 000 00 00", wa: "Order via WhatsApp",
      errName: "Please enter your name.", errPhone: "Please enter a valid WhatsApp number.", noWa: "WhatsApp number is not set yet.",
      intro: "Hello, I would like to place an order.", total: "Total", name: "Name", phone: "Number", or: "or", account: "Order with account (sign-in required)",
      fail: "Order could not be created." }
  };
  var t = TX[lang] || TX.az;
  var catalog = [];
  var state = { name: "", phone: "" };

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
    parts.push("", t.total + ": " + L.total.toFixed(2) + " AZN", t.name + ": " + state.name.trim(), t.phone + ": " + state.phone.trim());
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
    box.innerHTML = rows +
      '<p style="margin:14px 0;font-size:18px"><b>' + DB.t("total") + ': <span class="price">' + L.total.toFixed(2) + " AZN</span></b></p>" +
      '<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px"><label for="cName" class="muted" style="font-size:14px">' + t.nameLbl + "</label>" +
      '<input id="cName" type="text" placeholder="' + esc(t.namePh) + '" value="' + esc(state.name) + '" style="' + inp + '"></div>' +
      '<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:8px"><label for="cPhone" class="muted" style="font-size:14px">' + t.phoneLbl + "</label>" +
      '<input id="cPhone" type="tel" placeholder="' + esc(t.phonePh) + '" value="' + esc(state.phone) + '" style="' + inp + '"></div>' +
      '<div class="err" id="waErr"></div>' +
      '<button class="btn gold" id="waBtn" style="width:100%;padding:14px">' + t.wa + "</button>" +
      '<p class="muted" style="text-align:center;margin:12px 0;font-size:13px">' + t.or + "</p>" +
      '<button class="btn" id="checkoutBtn" style="width:100%">' + t.account + "</button>";

    box.querySelectorAll("[data-a]").forEach(function (b) {
      b.onclick = function () {
        var k = b.dataset.k, m = Number(b.dataset.m), it = DB.cart.get().find(function (x) { return x.product_key === k && x.months === m; });
        if (!it) return;
        if (b.dataset.a === "x") DB.cart.remove(k, m);
        else if (b.dataset.a === "+") DB.cart.setQty(k, m, it.qty + 1);
        else DB.cart.setQty(k, m, it.qty - 1);
      };
    });
    document.getElementById("cName").oninput = function (e) { state.name = e.target.value; };
    document.getElementById("cPhone").oninput = function (e) { state.phone = e.target.value; };
    document.getElementById("waBtn").onclick = orderWa;
    document.getElementById("checkoutBtn").onclick = checkout;
  }

  async function checkout() {
    err.textContent = "";
    var btn = document.getElementById("checkoutBtn"); btn.disabled = true;
    var res = await DBApi.post("/api/orders", { items: DB.cart.get() });
    btn.disabled = false;
    if (res.status === 401) { location.href = "login.html?next=cart.html"; return; }
    if (!res.ok) { err.textContent = (res.data && res.data.error) || t.fail; return; }
    DB.cart.save([]);
    location.href = "orders.html?created=1";
  }

  // "cart-changed" hadisəsi (səbət nişanı) da draw-u çağırır; yazı sahələri state-də qorunur
  window.addEventListener("cart-changed", function () { if (!document.hidden && catalog.length) draw(); });

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

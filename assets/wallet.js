/* DigiBaku — "Keşbek haqqında" və "Balans necə artırılır" səhifəsi (wallet.html#kesbek / wallet.html#balans).
   Eyni anda yalnız biri göstərilir; müştəri hansına girirsə onu görür. Məlumat keşdən dərhal açılır.
   Keşbek faizi, qaydalar və balans artırma təlimatı admin paneldən (Keşbek bölməsi) gəlir.
   Daxil olmuş istifadəçi üçün öz balansı və tarixçəsi də göstərilir. */
(function () {
  var box = document.getElementById("wBox");
  if (!box) return;
  var lang = (window.DB && DB.lang) || "az";
  var TX = {
    az: { title: "Keşbek və balans", tCash: "Keşbek haqqında", tBal: "Balans necə artırılır", other: "Digər: ", cash: "Keşbek haqqında", top: "Balans necə artırılır", rules: "Qaydalar", pct: "keşbek",
      sub: "Hər uğurlu sifarişin bir hissəsi balansınıza qayıdır.", bal: "Sizin balansınız", hist: "Balans tarixçəsi", none: "Əməliyyat yoxdur.",
      login: "Balansınızı görmək üçün daxil olun", loginBtn: "Daxil ol", wa: "WhatsApp ilə balansı artır", waMsg: "Salam, balansımı artırmaq istəyirəm.",
      fail: "Məlumat yüklənmədi.", retry: "Yenidən cəhd et",
      topDef: ["Balansı artırmaq üçün WhatsApp vasitəsilə bizimlə əlaqə saxlayın.", "Ödənişi etdikdən sonra çeki (skrin) və hesabınızın e-poçtunu göndərin.", "Ödəniş yoxlanıldıqdan sonra məbləğ balansınıza əlavə olunur."],
      cashDef: function (p) { return ["Hər ödənilmiş sifarişdən " + p + "% keşbek balansınıza əlavə olunur.", "Keşbek sifariş \"Ödənilib\" və ya \"Təhvil verildi\" statusuna keçəndə hesablanır.", "Hər sifariş üçün keşbek yalnız bir dəfə hesablanır.", "Balansınızı növbəti sifarişlərdə ödəniş üçün istifadə edə bilərsiniz."]; } },
    ru: { title: "Кешбэк и баланс", tCash: "О кешбэке", tBal: "Как пополнить баланс", other: "Ещё: ", cash: "О кешбэке", top: "Как пополнить баланс", rules: "Правила", pct: "кешбэк",
      sub: "С каждого успешного заказа часть суммы возвращается на баланс.", bal: "Ваш баланс", hist: "История баланса", none: "Операций нет.",
      login: "Войдите, чтобы увидеть баланс", loginBtn: "Войти", wa: "Пополнить через WhatsApp", waMsg: "Здравствуйте, хочу пополнить баланс.",
      fail: "Не удалось загрузить данные.", retry: "Повторить",
      topDef: ["Чтобы пополнить баланс, свяжитесь с нами через WhatsApp.", "После оплаты отправьте чек (скриншот) и e-mail вашего аккаунта.", "После проверки платежа сумма будет зачислена на ваш баланс."],
      cashDef: function (p) { return ["С каждого оплаченного заказа " + p + "% кешбэка зачисляется на ваш баланс.", "Кешбэк начисляется, когда заказ получает статус «Оплачен» или «Выдан».", "Кешбэк за каждый заказ начисляется только один раз.", "Баланс можно использовать для оплаты следующих заказов."]; } },
    en: { title: "Cashback & balance", tCash: "About cashback", tBal: "How to top up balance", other: "See also: ", cash: "About cashback", top: "How to top up your balance", rules: "Rules", pct: "cashback",
      sub: "A part of every successful order returns to your balance.", bal: "Your balance", hist: "Balance history", none: "No transactions yet.",
      login: "Sign in to see your balance", loginBtn: "Sign in", wa: "Top up via WhatsApp", waMsg: "Hello, I would like to top up my balance.",
      fail: "Could not load the data.", retry: "Try again",
      topDef: ["To top up your balance, contact us on WhatsApp.", "After paying, send the receipt (screenshot) and your account e-mail.", "Once the payment is verified, the amount is added to your balance."],
      cashDef: function (p) { return [p + "% cashback is added to your balance from every paid order.", "Cashback is credited when the order status becomes \"Paid\" or \"Delivered\".", "Cashback is credited only once per order.", "You can use your balance to pay for future orders."]; } }
  };
  var t = TX[lang] || TX.az;
  var h1 = document.getElementById("wTitle");

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function lines(x) { return String(x || "").split(/\r?\n/).map(function (v) { return v.trim(); }).filter(Boolean); }
  function ul(a) { return '<ul style="margin:8px 0 0;padding-left:18px;font-size:14px;line-height:1.7">' + a.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>"; }
  function loc() { return lang === "ru" ? "ru-RU" : lang === "en" ? "en-GB" : "az-AZ"; }

  var info = (window.DigiBalance && DigiBalance.info()) || null;
  var bal = window.DigiBalance ? DigiBalance.cached() : null;
  var ledger = null, failed = false;
  var hint = /(?:^|; )digibaku_auth=1/.test(document.cookie || "");
  var loggedIn = hint ? true : false;   // cookie ipucu ilə dərhal; sessiya arxa planda təsdiqlənir
  if (window.DigiBalance) { var cd = DigiBalance.data(); if (cd && cd.ledger) { bal = Number(cd.balance || 0); ledger = cd.ledger; } }

  function view() { return (location.hash || "").replace("#", "") === "balans" ? "balans" : "kesbek"; }

  function draw() {
    var v = view();
    var pct = info ? Number(info.percent || 0) : 0;
    var pctTxt = String(pct % 1 === 0 ? pct : pct.toFixed(2));
    var title = v === "balans" ? t.tBal : t.tCash;
    document.title = title + " — DigiBaku";
    if (h1) h1.textContent = title;
    var html = "";

    if (v === "kesbek") {
      var cr = info ? lines(lang === "az" ? info.rules : info["rules_" + lang]) : [];
      if (!cr.length) cr = t.cashDef(pctTxt);
      html = '<div class="card-box" id="kesbek"><h2 style="font-size:17px;margin:0 0 6px">' + esc(t.cash) + "</h2>" +
        '<b class="price" style="font-size:20px">' + esc(pctTxt) + "% " + esc(t.pct) + "</b>" +
        '<p class="muted" style="font-size:13px;margin:6px 0 0">' + esc(t.sub) + "</p>" + ul(cr) + "</div>";
    } else {
      var tr = info ? lines(info["topup_" + lang]) : [];
      if (!tr.length) tr = t.topDef;
      var wa = ""; try { wa = DB.waLink(t.waMsg); } catch (e) {}
      if (wa === "#") wa = "";
      var me = "";
      if (loggedIn === false) {
        me = '<div class="card-box" style="margin-bottom:12px"><p class="muted" style="margin:0 0 10px">' + esc(t.login) + '</p><a class="btn gold" href="login.html?next=wallet.html%23balans">' + esc(t.loginBtn) + "</a></div>";
      } else if (loggedIn === true) {
        var led = "";
        if (ledger && ledger.length) {
          led = ledger.map(function (x) {
            var pos = Number(x.amount) >= 0;
            return '<div style="border-top:1px solid #262626;padding:8px 0;font-size:13px;display:flex;justify-content:space-between;gap:8px"><div>' + esc(x.reason || "—") +
              '<div class="muted" style="font-size:12px">' + esc(new Date(x.created_at).toLocaleString(loc())) + "</div></div>" +
              '<b style="color:' + (pos ? "#4ade80" : "#f87171") + ';white-space:nowrap">' + (pos ? "+" : "") + Number(x.amount).toFixed(2) + " AZN</b></div>";
          }).join("");
        }
        me = '<div class="card-box" style="margin-bottom:12px"><span class="muted" style="font-size:13px">' + esc(t.bal) + '</span><br><b class="price" style="font-size:24px">' +
          (bal === null ? "…" : Number(bal).toFixed(2) + " AZN") + "</b>" +
          (failed && bal === null ? '<p class="muted" style="font-size:13px">' + esc(t.fail) + ' <button class="btn" type="button" data-retry="1">' + esc(t.retry) + "</button></p>" : "") +
          '<div style="margin-top:10px"><b style="font-size:14px">' + esc(t.hist) + "</b>" +
          (led || '<p class="muted" style="font-size:13px;margin-top:6px">' + esc(ledger === null ? "..." : t.none) + "</p>") + "</div></div>";
      }
      html = me + '<div class="card-box" id="balans"><h2 style="font-size:17px;margin:0 0 6px">' + esc(t.top) + "</h2>" + ul(tr) +
        (wa ? '<p style="margin:14px 0 0"><a class="btn gold" target="_blank" rel="noopener" href="' + esc(wa) + '">' + esc(t.wa) + "</a></p>" : "") + "</div>";
    }

    // Digər səhifəyə keçid (məzmun ayrıdır, yalnız keçid göstərilir)
    var other = v === "balans" ? { h: "#kesbek", l: t.tCash } : { h: "#balans", l: t.tBal };
    html += '<p style="margin:14px 2px 0;font-size:14px"><span class="muted">' + esc(t.other) + '</span><a href="wallet.html' + other.h + '" style="color:var(--gold)">' + esc(other.l) + " →</a></p>";
    box.innerHTML = html;
  }

  async function getInfo() {
    if (window.DigiBalance) return DigiBalance.loadInfo();
    for (var i = 0; i < 3; i++) {
      if (i) await new Promise(function (r) { setTimeout(r, 1000 * i); });
      try {
        var r = await fetch("/api/shop?action=cashback_info&_=" + Date.now(), { cache: "no-store" });
        if (r.ok) { var d = await r.json(); if (d && d.cashback) return d.cashback; }
      } catch (e) {}
    }
    return null;
  }

  async function loadMe() {
    if (!window.DigiAuth) { loggedIn = false; draw(); return; }
    // sessiya təsdiqi və balans eyni anda başlayır (biri digərini gözləmir)
    var bp = window.DigiBalance ? DigiBalance.refresh() : Promise.resolve(null);
    var s = await DigiAuth.getSession();
    if (s.ok !== false) {
      loggedIn = !!s.session;
      if (!loggedIn) { draw(); return; }
    }
    var d = await bp;
    if (d && d.ledger) { bal = Number(d.balance || 0); ledger = d.ledger; failed = false; }
    else if (bal === null) { failed = true; }
    draw();
  }

  box.addEventListener("click", function (e) {
    if (e.target && e.target.getAttribute && e.target.getAttribute("data-retry")) { failed = false; draw(); loadMe(); }
  });
  window.addEventListener("hashchange", function () { draw(); window.scrollTo(0, 0); });
  if (window.DigiBalance) {
    DigiBalance.on(function (d) { if (d && d.ledger) { bal = Number(d.balance || 0); ledger = d.ledger; failed = false; draw(); } });
  }

  draw();
  getInfo().then(function (c) { if (c) { info = c; draw(); } });
  loadMe();
})();

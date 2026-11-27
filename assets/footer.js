/* DigiBaku — vahid footer. Bütün səhifələrdəki köhnə <footer> bloku avtomatik əvəz olunur.
   Əlaqə məlumatları admin paneldəki "Sayt parametrləri"ndən gəlir. */
(function () {
  var olds = document.querySelectorAll("footer");
  if (!olds.length) return;

  var lang = (window.DB && DB.lang) || "az";
  var TX = {
    az: {
      ctaT: "Hansı xidməti seçəcəyinizi bilmirsiniz?", ctaD: "Yazın, sizə uyğun variantı birlikdə tapaq.",
      wa: "WhatsApp-da yaz", chat: "Canlı çat",
      tag: "Netflix, YouTube Premium, ChatGPT, Spotify və digər premium xidmətlər — bir yerdə, sərfəli qiymətə.",
      g1: "Alış-veriş", g2: "Populyar xidmətlər", g3: "Məlumat", g4: "Əlaqə",
      all: "Bütün məhsullar", cb: "Keşbek haqqında", top: "Balans necə artırılır", cart: "Səbət", orders: "Sifarişlərim", profile: "Profilim",
      about: "Haqqımızda", faq: "FAQ", contact: "Əlaqə", rules: "Sifariş və xidmət qaydaları",
      privacy: "Məxfilik siyasəti", terms: "İstifadə şərtləri",
      lWa: "WhatsApp", lPhone: "Telefon", lMail: "E-poçt", lCity: "Ünvan", lHours: "İş saatları",
      b1: "Sürətli çatdırılma", b2: "Şəffaf qiymət", b3: "Canlı dəstək", rights: "Bütün hüquqlar qorunur."
    },
    ru: {
      ctaT: "Не знаете, какой сервис выбрать?", ctaD: "Напишите нам — вместе подберём подходящий вариант.",
      wa: "Написать в WhatsApp", chat: "Онлайн-чат",
      tag: "Netflix, YouTube Premium, ChatGPT, Spotify и другие премиум-сервисы — в одном месте по выгодной цене.",
      g1: "Покупки", g2: "Популярные сервисы", g3: "Информация", g4: "Контакты",
      all: "Все товары", cb: "О кешбэке", top: "Как пополнить баланс", cart: "Корзина", orders: "Мои заказы", profile: "Профиль",
      about: "О нас", faq: "FAQ", contact: "Контакты", rules: "Правила заказа и услуг",
      privacy: "Политика конфиденциальности", terms: "Условия использования",
      lWa: "WhatsApp", lPhone: "Телефон", lMail: "E-mail", lCity: "Адрес", lHours: "Часы работы",
      b1: "Быстрая доставка", b2: "Прозрачная цена", b3: "Живая поддержка", rights: "Все права защищены."
    },
    en: {
      ctaT: "Not sure which service to pick?", ctaD: "Message us and we will find the right option together.",
      wa: "Message on WhatsApp", chat: "Live chat",
      tag: "Netflix, YouTube Premium, ChatGPT, Spotify and other premium services — in one place, at fair prices.",
      g1: "Shop", g2: "Popular services", g3: "Information", g4: "Contact",
      all: "All products", cb: "About cashback", top: "How to top up balance", cart: "Cart", orders: "My orders", profile: "Profile",
      about: "About us", faq: "FAQ", contact: "Contact", rules: "Order & service rules",
      privacy: "Privacy policy", terms: "Terms of use",
      lWa: "WhatsApp", lPhone: "Phone", lMail: "Email", lCity: "Address", lHours: "Working hours",
      b1: "Fast delivery", b2: "Transparent price", b3: "Live support", rights: "All rights reserved."
    }
  };
  var t = TX[lang] || TX.az;

  var CSS =
    "footer.dbf{position:relative;margin-top:56px;padding:0;border:0;color:var(--muted);font-size:14px;background:radial-gradient(900px 260px at 12% 0,rgba(212,175,55,.09),transparent 70%),#050505}" +
    "footer.dbf:before{content:'';position:absolute;left:0;right:0;top:0;height:1px;background:linear-gradient(90deg,transparent,var(--gold),transparent)}" +
    "footer.dbf a{display:inline;padding:0}" +
    ".dbf .in{max-width:1100px;margin:0 auto;padding:0 16px}" +
    ".dbf-cta{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:14px;margin:-28px 0 0;padding:20px;border:1px solid rgba(212,175,55,.35);border-radius:18px;background:linear-gradient(135deg,#17140a,#0c0c0c);position:relative}" +
    ".dbf-cta b{display:block;color:var(--text);font-size:17px;margin-bottom:2px}" +
    ".dbf-cta span{color:var(--muted)}" +
    ".dbf-cta .row{display:flex;gap:8px;flex-wrap:wrap}" +
    "footer.dbf .dbf-btn{display:inline-flex;align-items:center;gap:8px;padding:10px 16px;border-radius:999px;font-weight:700;font-size:14px;border:1px solid var(--gold);color:var(--gold)}" +
    "footer.dbf .dbf-btn svg{width:18px;height:18px;fill:currentColor}" +
    "footer.dbf .dbf-btn.fill{background:var(--gold);color:#000}" +
    "footer.dbf .dbf-btn.fill:hover{background:var(--gold-d)}" +
    "footer.dbf .dbf-btn.line:hover{background:rgba(212,175,55,.12)}" +
    ".dbf-main{display:grid;gap:0;padding:30px 0 8px}" +
    ".dbf-brand .nm{display:flex;align-items:center;gap:10px;font-weight:800;font-size:22px;color:var(--gold);letter-spacing:.4px}" +
    ".dbf-brand .mk{width:34px;height:34px;border-radius:10px;background:var(--gold);color:#000;display:flex;align-items:center;justify-content:center;font-size:18px}" +
    ".dbf-brand p{margin:12px 0 14px;max-width:340px;line-height:1.6}" +
    ".dbf-soc{display:flex;gap:8px}" +
    "footer.dbf .dbf-soc a{width:38px;height:38px;border-radius:50%;border:1px solid var(--line);background:var(--card);display:flex;align-items:center;justify-content:center;color:var(--text);transition:border-color .2s,color .2s}" +
    "footer.dbf .dbf-soc a:hover{border-color:var(--gold);color:var(--gold)}" +
    ".dbf-soc svg{width:18px;height:18px;fill:currentColor}" +
    ".dbf-g{border-bottom:1px solid var(--line)}" +
    ".dbf-g summary{display:flex;align-items:center;justify-content:space-between;padding:16px 0;cursor:pointer;list-style:none;color:var(--text);font-weight:700;font-size:13px;letter-spacing:1.2px;text-transform:uppercase}" +
    ".dbf-g summary::-webkit-details-marker{display:none}" +
    ".dbf-g summary:after{content:'+';color:var(--gold);font-size:20px;font-weight:400;line-height:1}" +
    ".dbf-g[open] summary:after{content:'–'}" +
    ".dbf-g ul{list-style:none;padding:0 0 14px}" +
    "footer.dbf .dbf-g li a{display:inline-block;padding:6px 0;color:var(--muted);transition:color .2s,transform .2s}" +
    "footer.dbf .dbf-g li a:hover{color:var(--gold);transform:translateX(3px)}" +
    ".dbf-g.ct li{display:flex;gap:10px;align-items:flex-start;padding:7px 0}" +
    ".dbf-g.ct li i{flex:0 0 auto;width:30px;height:30px;border-radius:9px;background:var(--card);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;color:var(--gold);font-style:normal}" +
    ".dbf-g.ct li i svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}" +
    ".dbf-g.ct small{display:block;font-size:11px;letter-spacing:.6px;text-transform:uppercase;color:#7a7a7a}" +
    "footer.dbf .dbf-g.ct li a{padding:0;color:var(--text);word-break:break-all}" +
    ".dbf-g.ct li span.v{color:var(--text)}" +
    ".dbf-trust{display:grid;gap:8px;padding:18px 0}" +
    ".dbf-trust div{display:flex;align-items:center;gap:10px;padding:10px 14px;border:1px solid var(--line);border-radius:12px;background:var(--card);color:var(--text);font-size:13px}" +
    ".dbf-trust div:before{content:'';width:7px;height:7px;border-radius:50%;background:var(--gold);box-shadow:0 0 8px var(--gold)}" +
    ".dbf-bot{border-top:1px solid var(--line);padding:16px 0 26px;display:flex;flex-wrap:wrap;gap:8px 18px;justify-content:space-between;font-size:13px}" +
    ".dbf-bot nav{display:flex;gap:16px;flex-wrap:wrap}" +
    ".dbf-bot a:hover{color:var(--gold)}" +
    "@media(min-width:720px){.dbf-trust{grid-template-columns:repeat(3,1fr)}}" +
    "@media(min-width:900px){" +
      ".dbf-main{grid-template-columns:1.5fr 1fr 1.1fr 1fr 1.4fr;gap:28px;padding:38px 0 14px}" +
      ".dbf-g{border:0}" +
      ".dbf-g summary{pointer-events:none;padding:0 0 12px;cursor:default}" +
      ".dbf-g summary:after{display:none}" +
      ".dbf-cta{padding:24px 28px}" +
    "}";

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  var WA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.05 21.8a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.89 9.89-9.89 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 7c0 5.45-4.44 9.88-9.89 9.88zM20.47 3.5A11.8 11.8 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.9c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.9 11.9 0 0 0 5.69 1.45c6.55 0 11.89-5.34 11.89-11.9 0-3.18-1.24-6.17-3.47-8.4z"/></svg>';
  var CHAT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3C6.5 3 2 6.6 2 11c0 2.2 1.1 4.2 2.9 5.6L4 21l4.6-2.3c1.1.3 2.2.5 3.4.5 5.5 0 10-3.6 10-8.2S17.5 3 12 3z"/></svg>';
  var IG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm5 3.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 0 1 12 7.5zm0 2A2.5 2.5 0 1 0 14.5 12 2.5 2.5 0 0 0 12 9.5zM17.2 5.8a1.1 1.1 0 1 1-1.1 1.1 1.1 1.1 0 0 1 1.1-1.1z"/></svg>';
  var TT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.6 2h-3.2v13.2a2.8 2.8 0 1 1-2.8-2.8c.3 0 .6 0 .8.1V9.2a6 6 0 1 0 5.2 5.9V8.6a7.4 7.4 0 0 0 4.4 1.4V6.8A4.4 4.4 0 0 1 16.6 2z"/></svg>';
  var I_PH = '<svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>';
  var I_ML = '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>';
  var I_PIN = '<svg viewBox="0 0 24 24"><path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>';
  var I_CLK = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
  var I_WA = '<svg viewBox="0 0 24 24"><path d="M4 20l1.3-4.2A8 8 0 1 1 8.3 18.8L4 20z"/></svg>';

  function group(title, items, extra) {
    return '<details class="dbf-g' + (extra ? " " + extra : "") + '"><summary>' + title + "</summary><ul>" + items + "</ul></details>";
  }
  function li(href, text) { return '<li><a href="' + href + '">' + text + "</a></li>"; }

  var year = new Date().getFullYear();
  var f = el("footer", "dbf");
  f.innerHTML =
    '<div class="in">' +
      '<div class="dbf-cta"><div><b>' + t.ctaT + "</b><span>" + t.ctaD + "</span></div>" +
        '<div class="row"><a class="dbf-btn fill" data-f="wa-cta" style="display:none" href="#" target="_blank" rel="noopener">' + WA + t.wa + "</a>" +
        '<a class="dbf-btn line" href="chat.html">' + CHAT + t.chat + "</a></div></div>" +
      '<div class="dbf-main">' +
        '<div class="dbf-brand"><div class="nm"><span class="mk">D</span><span data-f="logo">DigiBaku</span></div><p>' + t.tag + "</p>" +
          '<div class="dbf-soc">' +
            '<a data-f="ig" href="#" target="_blank" rel="noopener" aria-label="Instagram" style="display:none">' + IG + "</a>" +
            '<a data-f="tt" href="#" target="_blank" rel="noopener" aria-label="TikTok" style="display:none">' + TT + "</a>" +
            '<a data-f="wa" href="#" target="_blank" rel="noopener" aria-label="WhatsApp" style="display:none">' + WA + "</a>" +
          "</div></div>" +
        group(t.g1, li("products.html", t.all) + li("cart.html", t.cart) + li("orders.html", t.orders) + li("profile.html", t.profile) + li("wallet.html#kesbek", t.cb) + li("wallet.html#balans", t.top)) +
        group(t.g2, li("products.html?q=Netflix", "Netflix") + li("products.html?q=YouTube", "YouTube Premium") + li("products.html?q=ChatGPT", "ChatGPT") + li("products.html?q=Spotify", "Spotify") + li("products.html?q=Gemini", "Gemini")) +
        group(t.g3, li("about.html", t.about) + li("faq.html", t.faq) + li("contact.html", t.contact) + li("rules.html", t.rules)) +
        group(t.g4,
          '<li data-f="r-wa" style="display:none"><i>' + I_WA + "</i><div><small>" + t.lWa + '</small><a href="#" target="_blank" rel="noopener" data-v></a></div></li>' +
          '<li data-f="r-phone" style="display:none"><i>' + I_PH + "</i><div><small>" + t.lPhone + '</small><a href="#" data-v></a></div></li>' +
          '<li data-f="r-email" style="display:none"><i>' + I_ML + "</i><div><small>" + t.lMail + '</small><a href="#" data-v></a></div></li>' +
          '<li data-f="r-city" style="display:none"><i>' + I_PIN + "</i><div><small>" + t.lCity + '</small><span class="v" data-v></span></div></li>' +
          '<li data-f="r-hours" style="display:none"><i>' + I_CLK + "</i><div><small>" + t.lHours + '</small><span class="v" data-v></span></div></li>',
          "ct") +
      "</div>" +
      '<div class="dbf-trust"><div>' + t.b1 + "</div><div>" + t.b2 + "</div><div>" + t.b3 + "</div></div>" +
      '<div class="dbf-bot"><span>© ' + year + ' <span data-f="logo2">DigiBaku</span>. ' + t.rights + "</span>" +
        '<nav><a href="privacy.html">' + t.privacy + '</a><a href="terms.html">' + t.terms + "</a></nav></div>" +
    "</div>";

  var st = document.createElement("style");
  st.textContent = CSS;
  document.head.appendChild(st);

  olds.forEach(function (o, i) {
    if (i === 0) o.replaceWith(f); else o.remove();
  });

  // Masaüstündə bütün qruplar açıq, mobildə yığcam (accordion)
  var mq = window.matchMedia("(min-width:900px)");
  function syncOpen() { f.querySelectorAll("details.dbf-g").forEach(function (d) { if (mq.matches) d.open = true; }); }
  syncOpen();
  if (mq.addEventListener) mq.addEventListener("change", syncOpen);

  function q(sel) { return f.querySelector(sel); }
  function show(node, on) { if (node) node.style.display = on ? "" : "none"; }
  function row(key, text, href) {
    var r = q('[data-f="' + key + '"]'); if (!r) return;
    var v = r.querySelector("[data-v]");
    if (!text) { show(r, false); return; }
    v.textContent = text;
    if (href && v.tagName === "A") v.href = href;
    r.style.display = "flex";
  }

  function fill(s) {
    s = s || {};
    function sv(k) { return s[k + "_" + lang] || s[k + "_az"] || s[k] || ""; }
    var digits = String(s.whatsapp || "").replace(/\D/g, "");
    var waHref = digits ? "https://wa.me/" + digits : "";

    if (sv("logo_text")) { q('[data-f="logo"]').textContent = sv("logo_text"); q('[data-f="logo2"]').textContent = sv("logo_text"); }

    var cta = q('[data-f="wa-cta"]');
    if (waHref) { cta.href = waHref; show(cta, true); cta.style.display = "inline-flex"; } else { show(cta, false); }

    var wa = q('[data-f="wa"]'); if (waHref) { wa.href = waHref; wa.style.display = "flex"; } else { show(wa, false); }
    var ig = q('[data-f="ig"]'); if (s.instagram) { ig.href = s.instagram; ig.style.display = "flex"; } else { show(ig, false); }
    var tt = q('[data-f="tt"]'); if (s.tiktok) { tt.href = s.tiktok; tt.style.display = "flex"; } else { show(tt, false); }

    row("r-wa", s.whatsapp, waHref);
    row("r-phone", s.phone, s.phone ? "tel:" + String(s.phone).replace(/\s/g, "") : "");
    row("r-email", s.email, s.email ? "mailto:" + s.email : "");
    row("r-city", sv("city"));
    row("r-hours", sv("hours"));
  }

  if (window.DB && DB.settings && Object.keys(DB.settings).length) fill(DB.settings);
  fetch("/api/settings")
    .then(function (r) { return r.json(); })
    .then(function (d) { if (d && d.settings) fill(d.settings); })
    .catch(function () {});
})();

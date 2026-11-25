/* DigiBaku footer — bütün səhifələrdə eyni, saytdakı məlumatlarla dolur:
   kateqoriyalar (məhsul keşindən), səhifələr, əlaqə və sosial şəbəkələr (admin parametrlərindən). */
(function () {
  var f = document.querySelector("footer");
  if (!f || !window.DB) return;
  var lang = DB.lang || "az";

  var TX = {
    az: { tag: "Netflix, YouTube Premium, ChatGPT, Spotify və digər premium rəqəmsal xidmətlər — sərfəli qiymətə, bir yerdə.",
      prod: "Məhsullar", all: "Bütün məhsullar", acc: "Hesab", orders: "Sifarişlər", cart: "Səbət", profile: "Profilim",
      info: "Məlumat", about: "Haqqımızda", faq: "FAQ", contact: "Əlaqə", rules: "Sifariş və xidmət qaydaları", privacy: "Məxfilik siyasəti", terms: "İstifadə şərtləri",
      reach: "Əlaqə", wa: "WhatsApp", phone: "Telefon", mail: "E-poçt", city: "Ünvan", hours: "İş saatları", chat: "Çatda yazın",
      rights: "Bütün hüquqlar qorunur." },
    ru: { tag: "Netflix, YouTube Premium, ChatGPT, Spotify и другие премиальные цифровые сервисы — по выгодной цене, в одном месте.",
      prod: "Товары", all: "Все товары", acc: "Аккаунт", orders: "Заказы", cart: "Корзина", profile: "Профиль",
      info: "Информация", about: "О нас", faq: "FAQ", contact: "Контакты", rules: "Правила заказа и услуг", privacy: "Политика конфиденциальности", terms: "Условия использования",
      reach: "Связь", wa: "WhatsApp", phone: "Телефон", mail: "E-mail", city: "Адрес", hours: "Часы работы", chat: "Написать в чат",
      rights: "Все права защищены." },
    en: { tag: "Netflix, YouTube Premium, ChatGPT, Spotify and other premium digital services — at a fair price, all in one place.",
      prod: "Products", all: "All products", acc: "Account", orders: "Orders", cart: "Cart", profile: "Profile",
      info: "Information", about: "About us", faq: "FAQ", contact: "Contact", rules: "Order & service rules", privacy: "Privacy policy", terms: "Terms of use",
      reach: "Contact", wa: "WhatsApp", phone: "Phone", mail: "E-mail", city: "Address", hours: "Working hours", chat: "Chat with us",
      rights: "All rights reserved." }
  };
  var t = TX[lang] || TX.az;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function webUrl(u) { return /^https?:\/\//i.test(u || "") ? u : ""; }

  var cats = [];

  function render() {
    var s = DB.settings || {};
    var logo = DB.sv("logo_text") || "DigiBaku";
    var wa = s.whatsapp ? DB.waLink("") : "";
    var phone = s.phone ? String(s.phone) : "";
    var mail = s.email ? String(s.email) : "";
    var city = DB.sv("city"), hours = DB.sv("hours");
    var ig = webUrl(s.instagram), tk = webUrl(s.tiktok);

    var soc = "";
    if (ig) soc += '<a href="' + esc(ig) + '" target="_blank" rel="noopener">Instagram</a>';
    if (tk) soc += '<a href="' + esc(tk) + '" target="_blank" rel="noopener">TikTok</a>';
    if (wa) soc += '<a href="' + esc(wa) + '" target="_blank" rel="noopener">WhatsApp</a>';

    var catLinks = cats.map(function (c) {
      return '<a href="products.html?cat=' + encodeURIComponent(c.key) + '">' + esc(c["name_" + lang] || c.name_az) + "</a>";
    }).join("");

    var reach = "";
    if (wa) reach += '<a href="' + esc(wa) + '" target="_blank" rel="noopener"><span>' + t.wa + "</span>" + esc(s.whatsapp) + "</a>";
    if (phone) reach += '<a href="tel:' + esc(phone.replace(/\s/g, "")) + '"><span>' + t.phone + "</span>" + esc(phone) + "</a>";
    if (mail) reach += '<a href="mailto:' + esc(mail) + '"><span>' + t.mail + "</span>" + esc(mail) + "</a>";
    if (city) reach += '<div class="ft-row"><span>' + t.city + "</span>" + esc(city) + "</div>";
    if (hours) reach += '<div class="ft-row"><span>' + t.hours + "</span>" + esc(hours) + "</div>";
    reach += '<a class="ft-chat" href="chat.html">💬 ' + t.chat + "</a>";

    f.classList.add("ft");
    f.innerHTML =
      '<div class="ft-grid">' +
        '<div class="ft-col ft-brand"><a class="ft-logo" href="index.html">' + esc(logo) + "</a><p>" + t.tag + "</p>" +
          (soc ? '<div class="ft-soc">' + soc + "</div>" : "") + "</div>" +
        '<div class="ft-col"><h4>' + t.prod + "</h4>" + catLinks + '<a href="products.html">' + t.all + "</a>" +
          '<h4 class="ft-h2">' + t.acc + '</h4><a href="orders.html">' + t.orders + '</a><a href="cart.html">' + t.cart + '</a><a href="profile.html">' + t.profile + "</a></div>" +
        '<div class="ft-col"><h4>' + t.info + '</h4><a href="about.html">' + t.about + '</a><a href="faq.html">' + t.faq + '</a><a href="contact.html">' + t.contact + "</a>" +
          '<a href="rules.html">' + t.rules + '</a><a href="privacy.html">' + t.privacy + '</a><a href="terms.html">' + t.terms + "</a></div>" +
        '<div class="ft-col ft-contact"><h4>' + t.reach + "</h4>" + reach + "</div>" +
      "</div>" +
      '<div class="ft-bottom"><span>© ' + new Date().getFullYear() + " " + esc(logo) + "</span><span>" + t.rights + "</span></div>";
  }

  var css =
    "footer.ft{display:block;border-top:1px solid var(--line);margin-top:40px;padding:32px 16px 20px;font-size:14px;color:var(--muted)}" +
    ".ft-grid{display:grid;grid-template-columns:1.4fr 1fr 1fr 1.2fr;gap:28px}" +
    "footer.ft a{display:block;padding:4px 0;color:var(--muted)}" +
    "footer.ft a:hover{color:var(--gold)}" +
    ".ft h4{color:var(--text);font-size:14px;font-weight:700;margin-bottom:8px}" +
    ".ft h4.ft-h2{margin-top:18px}" +
    "footer.ft a.ft-logo{display:inline-block;font-size:22px;font-weight:800;color:var(--gold);padding:0}" +
    "footer.ft p{flex:none;margin:10px 0 0!important;line-height:1.55}" +
    ".ft-soc{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}" +
    "footer.ft .ft-soc a{display:inline-flex;padding:7px 14px;border:1px solid var(--line);border-radius:999px;color:var(--text);font-size:13px}" +
    "footer.ft .ft-soc a:hover{border-color:var(--gold);color:var(--gold)}" +
    ".ft-contact a span,.ft-row span{display:block;font-size:12px;color:var(--muted)}" +
    ".ft-row{padding:4px 0;color:var(--text)}" +
    ".ft-contact a{color:var(--text)}" +
    "footer.ft a.ft-chat{display:inline-flex;margin-top:10px;padding:9px 16px;border:1px solid var(--gold);border-radius:999px;color:var(--gold);font-weight:600}" +
    ".ft-bottom{display:flex;justify-content:space-between;gap:6px 16px;flex-wrap:wrap;margin-top:24px;padding-top:16px;border-top:1px solid var(--line);font-size:13px}" +
    "@media(max-width:899px){.ft-grid{grid-template-columns:1fr 1fr;gap:22px}.ft-brand,.ft-contact{grid-column:1/-1}.ft-bottom{padding-right:64px}}";
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  render();

  // Kateqoriyalar: əvvəlcə məhsul keşindən (əlavə sorğu yoxdur), keş yoxdursa bir dəfə yüklənir
  function gotCats(d) {
    cats = ((d && d.categories) || []).filter(function (c) { return c && c.key; }).slice(0, 6);
    render();
  }
  try {
    var cached = localStorage.getItem("digibaku_c1:/api/products");
    if (cached) gotCats(JSON.parse(cached));
    else if (window.DBApi) DBApi.swr("/api/products", gotCats);
  } catch (e) {
    if (window.DBApi) DBApi.swr("/api/products", gotCats);
  }

  // Sayt parametrləri (əlaqə, sosial şəbəkə) gec gəlir, gələndə yenidən çəkilir
  (function wait(n) {
    if (DB.settings && Object.keys(DB.settings).length) { render(); return; }
    if (n < 30) setTimeout(function () { wait(n + 1); }, 400);
  })(0);
})();

/* Məhsul səhifəsi: Məhsul haqqında / İstifadə qaydaları / Necə sifariş edim? / Rəylər */
(function () {
  var lang = (window.DB && DB.lang) || "az";
  var slug = new URLSearchParams(location.search).get("slug") || "";
  var box = document.getElementById("pdBox");
  if (!slug || !box) return;

  var TX = {
    az: { about: "Məhsul haqqında", usage: "İstifadə qaydaları", howto: "Necə sifariş edim?", reviews: "Rəylər",
      soon: "Məlumat tezliklə əlavə olunacaq.", noRev: "Bu məhsul üçün hələ təsdiqlənmiş rəy yoxdur.",
      write: "Rəy yaz", yourRating: "Qiymətiniz", yourText: "Rəyiniz", send: "Göndər",
      login: "Rəy yazmaq üçün daxil olun", loginBtn: "Daxil ol",
      sent: "Rəyiniz göndərildi. Admin təsdiq etdikdən sonra burada görünəcək.",
      pickRating: "Ulduz seçin.", tooShort: "Rəy çox qısadır.", err: "Rəy göndərilmədi.", ph: "Təcrübənizi yazın..." },
    ru: { about: "О товаре", usage: "Правила использования", howto: "Как заказать?", reviews: "Отзывы",
      soon: "Информация скоро появится.", noRev: "Подтверждённых отзывов об этом товаре пока нет.",
      write: "Написать отзыв", yourRating: "Ваша оценка", yourText: "Ваш отзыв", send: "Отправить",
      login: "Войдите, чтобы написать отзыв", loginBtn: "Вход",
      sent: "Отзыв отправлен. Он появится здесь после проверки администратором.",
      pickRating: "Выберите оценку.", tooShort: "Отзыв слишком короткий.", err: "Не удалось отправить отзыв.", ph: "Расскажите о своём опыте..." },
    en: { about: "About", usage: "Usage rules", howto: "How to order?", reviews: "Reviews",
      soon: "Information will be added soon.", noRev: "No approved reviews for this product yet.",
      write: "Write a review", yourRating: "Your rating", yourText: "Your review", send: "Submit",
      login: "Sign in to write a review", loginBtn: "Sign in",
      sent: "Review submitted. It will appear here once approved by an admin.",
      pickRating: "Please pick a rating.", tooShort: "Review is too short.", err: "Could not submit the review.", ph: "Share your experience..." }
  };
  var t = TX[lang] || TX.az;
  var TABS = ["about", "usage", "howto", "reviews"];

  var data = null, loading = false, active = "about", user = undefined, rating = 0, sentMsg = "";

  var st = document.createElement("style");
  st.textContent =
    ".ptabs{margin:28px 0}" +
    ".ptabs-nav{display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;margin-bottom:14px;-webkit-overflow-scrolling:touch}" +
    ".ptabs-nav button{flex:0 0 auto;border:1px solid var(--line);background:var(--card);color:var(--text);border-radius:999px;padding:10px 16px;font-size:14px;cursor:pointer;white-space:nowrap}" +
    ".ptabs-nav button.on{background:var(--gold);border-color:var(--gold);color:#000;font-weight:700}" +
    ".ptabs-body{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:18px}" +
    ".ptxt{white-space:pre-line;line-height:1.65;color:#d4d4d4}" +
    ".rv{border-bottom:1px solid var(--line);padding:12px 0}.rv:last-of-type{border-bottom:0}" +
    ".stars{color:#d4af37;letter-spacing:2px}" +
    ".starpick button{background:none;border:0;font-size:28px;color:#555;cursor:pointer;padding:0 2px}" +
    ".starpick button.on{color:#d4af37}" +
    ".rv-form textarea{width:100%;box-sizing:border-box;background:var(--card2);border:1px solid var(--line);color:var(--text);border-radius:12px;padding:12px;font-size:16px;min-height:100px;margin:8px 0}";
  document.head.appendChild(st);

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function stars(n) {
    n = Math.max(0, Math.min(5, Math.round(Number(n) || 0)));
    return "★".repeat(n) + "☆".repeat(5 - n);
  }
  function pickText(o) { return (o && (o[lang] || o.az || o.en || o.ru)) || ""; }

  function aboutHtml() {
    var txt = pickText(data.content.about);
    if (txt) return '<div class="ptxt">' + esc(txt) + "</div>";
    // Admin mətn yazmayıbsa məhsulun təsviri göstərilir
    var p = window.DB && DB.currentProduct;
    var d = p && p.description ? pickText(p.description) : "";
    var f = p && p.features ? ((p.features[lang] && p.features[lang].length ? p.features[lang] : p.features.az) || []) : [];
    if (!d && !f.length) return '<div class="muted">' + esc(t.soon) + "</div>";
    return (d ? '<div class="ptxt">' + esc(d) + "</div>" : "") +
      (f.length ? '<ul style="margin:10px 0 0 18px;color:#d4d4d4">' + f.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" : "");
  }

  function textHtml(key) {
    var txt = pickText(data.content[key]);
    return txt ? '<div class="ptxt">' + esc(txt) + "</div>" : '<div class="muted">' + esc(t.soon) + "</div>";
  }

  function reviewsHtml() {
    var s = data.stats || { count: 0, avg: 0 };
    var head = s.count ? '<div style="margin-bottom:8px"><span class="stars">' + stars(s.avg) + "</span> <b>" + esc(s.avg) + "</b> <span class=\"muted\">(" + s.count + ")</span></div>" : "";
    var rows = (data.reviews || []).map(function (r) {
      var text = r["body_" + lang] || r.body_az || r.body_en || r.body_ru || "";
      var date = r.review_date ? String(r.review_date).slice(0, 10) : "";
      return '<div class="rv"><div class="stars">' + stars(r.rating) + "</div>" +
        '<p style="margin:6px 0;color:#d4d4d4;white-space:pre-line">' + esc(text) + "</p>" +
        '<div class="muted" style="font-size:13px">' + esc(r.author_name) + (date ? " · " + esc(date) : "") + "</div></div>";
    }).join("") || '<div class="muted">' + esc(t.noRev) + "</div>";

    var form;
    if (sentMsg) {
      form = '<div class="ok" style="margin-top:14px">' + esc(sentMsg) + "</div>";
    } else if (user === undefined) {
      form = "";
    } else if (!user) {
      form = '<div style="margin-top:16px"><p class="muted" style="margin-bottom:8px">' + esc(t.login) + '</p><a class="btn gold" href="login.html?next=' +
        encodeURIComponent("product.html?slug=" + slug) + '">' + esc(t.loginBtn) + "</a></div>";
    } else {
      var pick = [1, 2, 3, 4, 5].map(function (n) {
        return '<button type="button" data-star="' + n + '" class="' + (n <= rating ? "on" : "") + '" aria-label="' + n + '">★</button>';
      }).join("");
      form = '<div class="rv-form" style="margin-top:18px;border-top:1px solid var(--line);padding-top:16px"><b>' + esc(t.write) + "</b>" +
        '<div class="muted" style="font-size:13px;margin-top:8px">' + esc(t.yourRating) + "</div>" +
        '<div class="starpick">' + pick + "</div>" +
        '<textarea id="rvText" maxlength="1000" placeholder="' + esc(t.ph) + '" aria-label="' + esc(t.yourText) + '"></textarea>' +
        '<div class="err-txt" id="rvErr"></div>' +
        '<button type="button" class="btn gold" id="rvSend">' + esc(t.send) + "</button></div>";
    }
    return head + rows + form;
  }

  function render(sec) {
    var nav = TABS.map(function (k) {
      return '<button type="button" data-tab="' + k + '" class="' + (k === active ? "on" : "") + '">' + esc(t[k]) + "</button>";
    }).join("");
    var inner;
    if (!data) inner = '<div class="muted">...</div>';
    else if (active === "about") inner = aboutHtml();
    else if (active === "reviews") inner = reviewsHtml();
    else inner = textHtml(active);
    sec.innerHTML = '<div class="ptabs-nav">' + nav + '</div><div class="ptabs-body">' + inner + "</div>";

    sec.querySelectorAll("[data-tab]").forEach(function (b) {
      b.onclick = function () { active = b.getAttribute("data-tab"); render(sec); };
    });
    sec.querySelectorAll("[data-star]").forEach(function (b) {
      b.onclick = function () {
        var keep = (document.getElementById("rvText") || {}).value || "";
        rating = Number(b.getAttribute("data-star"));
        render(sec);
        document.getElementById("rvText").value = keep;
      };
    });
    var send = document.getElementById("rvSend");
    if (send) send.onclick = function () { submit(sec, send); };
  }

  async function submit(sec, btn) {
    var err = document.getElementById("rvErr");
    var text = document.getElementById("rvText").value.trim();
    if (!rating) { err.textContent = t.pickRating; return; }
    if (text.length < 5) { err.textContent = t.tooShort; return; }
    err.textContent = "";
    btn.disabled = true;
    var r = await DBApi.post("/api/shop?action=review", { product: slug, rating: rating, body: text });
    btn.disabled = false;
    if (r.status === 401) { location.href = "login.html?next=" + encodeURIComponent("product.html?slug=" + slug); return; }
    if (!r.ok) { err.textContent = (r.data && r.data.error) || t.err; return; }
    sentMsg = t.sent;
    render(sec);
  }

  function mount() {
    if (!box.querySelector(".order-box") || box.querySelector("#pTabs")) return;
    var sec = document.createElement("section");
    sec.id = "pTabs";
    sec.className = "ptabs";
    box.appendChild(sec);
    render(sec);
    if (data === null && !loading) {
      loading = true;
      fetch("/api/shop?action=extra&product=" + encodeURIComponent(slug))
        .then(function (r) { return r.json(); })
        .then(function (d) {
          data = { content: d.content || { about: {}, usage: {}, howto: {} }, reviews: d.reviews || [], stats: d.stats || { count: 0, avg: 0 } };
        })
        .catch(function () { data = { content: { about: {}, usage: {}, howto: {} }, reviews: [], stats: { count: 0, avg: 0 } }; })
        .then(function () { loading = false; var s = document.getElementById("pTabs"); if (s) render(s); });
    }
    if (user === undefined && window.DigiAuth) {
      DigiAuth.getSession().then(function (r) {
        user = r && r.session ? r.session.user : null;
        var s = document.getElementById("pTabs"); if (s && data) render(s);
      }).catch(function () { user = null; });
    }
  }

  // product-page.js səhifəni hər dəfə yenidən çəkdikdə bölmə yenidən əlavə olunur
  new MutationObserver(mount).observe(box, { childList: true, subtree: true });
  mount();
})();

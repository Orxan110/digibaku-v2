/* Məhsul səhifəsi tabları: Məhsul haqqında / İstifadə qaydaları / Necə sifariş edim?
   Rəylər artıq tab deyil: tabların altında həmişə görünən ayrıca bölmədir (yalnız bu məhsulun təsdiqlənmiş rəyləri).
   - Hər bölmədə əvvəl QISA görünüş, "Daha çox göstər" ilə ƏTRAFLI görünüş açılır.
   - Admin mətnində tək sətirdə --- yazılırsa: ondan əvvəlki hissə qısa, sonrakı hissə ətraflı olur.
     --- yoxdursa sayt mətni özü qısaldır.
   - Admin mətn yazmayıbsa, İstifadə qaydaları və Necə sifariş edim üçün hazır standart mətn göstərilir.
   - Rəy yazmaq: giriş tokeni serverə göndərilir, sessiya bitibsə yazılan rəy itmir (qaralama saxlanılır). */
(function () {
  var lang = (window.DB && DB.lang) || "az";
  var params = new URLSearchParams(location.search);
  var slug = params.get("slug") || "";
  var box = document.getElementById("pdBox");
  if (!slug || !box) return;

  var TX = {
    az: { about: "Məhsul haqqında", usage: "İstifadə qaydaları", howto: "Necə sifariş edim?", reviews: "Rəylər",
      soon: "Məlumat tezliklə əlavə olunacaq.", noRev: "Bu məhsul üçün hələ təsdiqlənmiş rəy yoxdur.",
      more: "Daha çox göstər", less: "Daha az göstər", adv: "Məhsulun üstünlükləri",
      write: "Rəy yaz", yourRating: "Qiymətiniz", yourText: "Rəyiniz", send: "Göndər", sending: "Göndərilir...",
      login: "Rəy yazmaq üçün daxil olun", loginBtn: "Daxil ol", as: "Rəy bu adla görünəcək:",
      sent: "Təşəkkür edirik! Rəyiniz göndərildi və admin təsdiqlədikdən sonra burada görünəcək.",
      dup: "Bu məhsul üçün artıq rəy göndərmisiniz.",
      relogin: "Sessiyanın vaxtı bitib. Rəyiniz yadda saxlanıldı, yenidən daxil olduqdan sonra geri qayıdıb göndərə bilərsiniz.",
      pickRating: "Ulduz seçin.", tooShort: "Rəy çox qısadır (ən azı 5 simvol).", err: "Rəy göndərilmədi. Bir az sonra yenidən cəhd edin.",
      ph: "Təcrübənizi yazın..." },
    ru: { about: "О товаре", usage: "Правила использования", howto: "Как заказать?", reviews: "Отзывы",
      soon: "Информация скоро появится.", noRev: "Подтверждённых отзывов об этом товаре пока нет.",
      more: "Показать больше", less: "Показать меньше", adv: "Преимущества товара",
      write: "Написать отзыв", yourRating: "Ваша оценка", yourText: "Ваш отзыв", send: "Отправить", sending: "Отправляется...",
      login: "Войдите, чтобы написать отзыв", loginBtn: "Вход", as: "Отзыв будет опубликован от имени:",
      sent: "Спасибо! Отзыв отправлен и появится здесь после проверки администратором.",
      dup: "Вы уже оставили отзыв об этом товаре.",
      relogin: "Сессия истекла. Ваш отзыв сохранён: войдите снова, вернитесь на эту страницу и отправьте его.",
      pickRating: "Выберите оценку.", tooShort: "Отзыв слишком короткий (минимум 5 символов).", err: "Не удалось отправить отзыв. Попробуйте позже.",
      ph: "Расскажите о своём опыте..." },
    en: { about: "About", usage: "Usage rules", howto: "How to order?", reviews: "Reviews",
      soon: "Information will be added soon.", noRev: "No approved reviews for this product yet.",
      more: "Show more", less: "Show less", adv: "Key benefits",
      write: "Write a review", yourRating: "Your rating", yourText: "Your review", send: "Submit", sending: "Sending...",
      login: "Sign in to write a review", loginBtn: "Sign in", as: "Your review will appear as:",
      sent: "Thank you! Your review was submitted and will appear here once approved by an admin.",
      dup: "You have already reviewed this product.",
      relogin: "Your session expired. Your review is saved: sign in again, come back to this page and submit it.",
      pickRating: "Please pick a rating.", tooShort: "Review is too short (at least 5 characters).", err: "Could not submit the review. Please try again later.",
      ph: "Share your experience..." }
  };
  var t = TX[lang] || TX.az;

  // Admin mətn yazmayıbsa göstərilən standart mətnlər (--- = qısa/ətraflı ayırıcısı)
  var DEFAULTS = {
    az: {
      howto: "1) Məhsulu və müddəti seçin.\n2) Ad və WhatsApp nömrənizi yazın.\n3) «WhatsApp-la sifariş et» düyməsinə basın.\n\n---\n\n" +
        "Düymə sizi WhatsApp-a yönləndirir. Sifariş məlumatları (məhsul, müddət, qiymət, ad və nömrə) mesajda hazır gəlir, sizə yalnız göndərmək qalır.\n\n" +
        "Operator sifarişinizi təsdiqləyir və ödəniş qaydasını WhatsApp-da bildirir.\n\n" +
        "Sifariş təsdiqləndikdən sonra hazırlanır. Dəqiq müddəti operator sifariş zamanı deyəcək.\n\n" +
        "Sualınız olarsa, Çat və ya WhatsApp vasitəsilə operatora yaza bilərsiniz.",
      usage: "Sifariş təsdiqləndikdən sonra məhsulun aktivləşdirilməsi və istifadəsi barədə operator sizə məlumat verir.\n\n---\n\n" +
        "Hesab və giriş məlumatlarınızı üçüncü şəxslərlə paylaşmayın.\n\n" +
        "Məhsulun funksiyaları, keyfiyyəti və əlçatanlığı region və abunə şərtlərinə görə dəyişə bilər.\n\n" +
        "İstifadə zamanı çətinlik yaranarsa, operatora Çat və ya WhatsApp vasitəsilə yazın."
    },
    ru: {
      howto: "1) Выберите товар и срок.\n2) Укажите имя и номер WhatsApp.\n3) Нажмите «Заказать в WhatsApp».\n\n---\n\n" +
        "Кнопка откроет WhatsApp. Данные заказа (товар, срок, цена, имя и номер) уже будут в сообщении — останется только отправить.\n\n" +
        "Оператор подтвердит заказ и сообщит порядок оплаты в WhatsApp.\n\n" +
        "После подтверждения заказ готовится. Точный срок оператор назовёт при оформлении.\n\n" +
        "Если появятся вопросы, напишите оператору в чате или в WhatsApp.",
      usage: "После подтверждения заказа оператор сообщит, как активировать и использовать товар.\n\n---\n\n" +
        "Не передавайте данные аккаунта и входа третьим лицам.\n\n" +
        "Функции, качество и доступность сервиса могут отличаться в зависимости от региона и условий подписки.\n\n" +
        "Если возникнут трудности, напишите оператору в чате или в WhatsApp."
    },
    en: {
      howto: "1) Choose the product and duration.\n2) Enter your name and WhatsApp number.\n3) Press “Order via WhatsApp”.\n\n---\n\n" +
        "The button opens WhatsApp. Your order details (product, duration, price, name and number) are already in the message, you only need to send it.\n\n" +
        "The operator confirms your order and explains the payment steps on WhatsApp.\n\n" +
        "Your order is prepared after confirmation. The operator will tell you the exact time when you order.\n\n" +
        "If you have questions, message the operator in the chat or on WhatsApp.",
      usage: "After your order is confirmed, the operator tells you how to activate and use the product.\n\n---\n\n" +
        "Do not share your account or login details with third parties.\n\n" +
        "Features, quality and availability may vary by region and subscription terms.\n\n" +
        "If you run into any trouble, write to the operator in the chat or on WhatsApp."
    }
  };

  var TABS = ["about", "usage", "howto"];
  var SHOW_REVIEWS = 3;
  var DRAFT_KEY = "digibaku_rv_" + slug;

  var data = null, loading = false;
  var active = TABS.indexOf(params.get("tab")) >= 0 ? params.get("tab") : "about";
  var scrolled = false;
  var user = undefined;            // undefined = yoxlanılır, null = daxil olmayıb
  var rating = 0, sentMsg = "", authLost = false, expanded = {};

  var st = document.createElement("style");
  st.textContent =
    ".ptabs{margin:28px 0}" +
    ".ptabs [hidden]{display:none!important}" +
    ".ptabs-nav{display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;margin-bottom:14px;-webkit-overflow-scrolling:touch;scrollbar-width:none}" +
    ".ptabs-nav::-webkit-scrollbar{display:none}" +
    ".ptabs-nav button{flex:0 0 auto;border:1px solid var(--line);background:var(--card);color:var(--text);border-radius:999px;padding:10px 16px;font-size:14px;cursor:pointer;white-space:nowrap;font-family:inherit}" +
    ".ptabs-nav button.on{background:var(--gold);border-color:var(--gold);color:#000;font-weight:700}" +
    ".ptabs-body{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:18px}" +
    ".pt-rich p{margin:0 0 12px;line-height:1.7;color:#d4d4d4}" +
    ".pt-rich h4{font-size:15px;color:var(--gold);margin:18px 0 8px;font-weight:700}" +
    ".pt-rich ul{margin:0 0 12px;padding-left:20px;color:#d4d4d4;line-height:1.6}" +
    ".pt-rich li{margin:5px 0}" +
    ".pt-rich ol.pt-steps{list-style:none;counter-reset:pts;padding:0;margin:0 0 12px}" +
    ".pt-rich ol.pt-steps li{counter-increment:pts;display:flex;gap:12px;align-items:flex-start;margin:10px 0;color:#e5e5e5}" +
    ".pt-rich ol.pt-steps li::before{content:counter(pts);flex:0 0 26px;height:26px;border-radius:50%;background:var(--gold);color:#000;font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center;margin-top:1px}" +
    ".pt-rich .pt-note{border-left:3px solid var(--gold);background:var(--card2);border-radius:8px;padding:10px 12px;color:#bdbdbd;font-size:14px}" +
    ".pt-rich > :last-child{margin-bottom:0}" +
    ".pt-more{margin-top:12px}" +
    ".pt-toggle{display:inline-flex;align-items:center;gap:8px;margin-top:14px;background:transparent;border:1px solid var(--line);color:var(--gold);border-radius:999px;padding:9px 16px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit}" +
    ".pt-toggle:hover{border-color:var(--gold)}" +
    ".pt-toggle .chev{width:8px;height:8px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(45deg);margin-top:-3px;transition:transform .2s}" +
    ".pt-toggle[aria-expanded=true] .chev{transform:rotate(-135deg);margin-top:3px}" +
    ".rv-sum{display:flex;align-items:baseline;gap:10px;margin-bottom:6px;flex-wrap:wrap}" +
    ".rv-sum .avg{font-size:30px;font-weight:800;color:var(--gold);line-height:1}" +
    ".rv{border-bottom:1px solid var(--line);padding:14px 0}" +
    ".rv:last-child{border-bottom:0}" +
    ".stars{color:#d4af37;letter-spacing:2px}" +
    ".rv p{margin:6px 0;color:#d4d4d4;white-space:pre-line;line-height:1.6;word-break:break-word}" +
    ".rv .who{font-size:13px;color:var(--muted)}" +
    ".starpick{display:flex;gap:2px;margin:2px 0 6px}" +
    ".starpick button{background:none;border:0;font-size:32px;line-height:1;color:#555;cursor:pointer;padding:2px 3px}" +
    ".starpick button.on{color:#d4af37}" +
    ".rv-form{margin-top:18px;border-top:1px solid var(--line);padding-top:16px}" +
    ".rv-form textarea{width:100%;background:var(--card2);border:1px solid var(--line);color:var(--text);border-radius:12px;padding:12px;font:inherit;font-size:16px;min-height:110px;margin:8px 0 4px;resize:vertical;outline:none}" +
    ".rv-form textarea:focus{border-color:var(--gold)}" +
    ".rv-form .cnt{font-size:12px;color:var(--muted);text-align:right}" +
    ".pt-warn{background:#2a2110;border:1px solid #6b5416;color:#f1d98a;border-radius:12px;padding:12px 14px;margin-bottom:12px;font-size:14px;line-height:1.5}" +
    ".pt-warn .btn{margin-top:10px}";
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
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }

  // ---------- Mətn: bloklara bölmə, qısa/ətraflı ----------
  function toBlocks(text) {
    return String(text || "").replace(/\r\n?/g, "\n").split(/\n[ \t]*\n/)
      .map(function (b) { return b.trim(); }).filter(Boolean);
  }
  function isHeadBlock(b) {
    return b.indexOf("\n") < 0 && /:$/.test(b) && b.length <= 90;
  }
  var MARK = /^\s*(?:-{3,}|\[\s*(?:daha\s*çox|more|подробнее)\s*\])\s*$/i;

  // { short, more } — more boşdursa "Daha çox" düyməsi çıxmır
  function split(text) {
    var norm = String(text || "").replace(/\r\n?/g, "\n").trim();
    if (!norm) return { short: "", more: "" };
    var lines = norm.split("\n"), idx = -1, i;
    for (i = 0; i < lines.length; i++) { if (MARK.test(lines[i])) { idx = i; break; } }
    if (idx >= 0) {
      var a = lines.slice(0, idx).join("\n").trim();
      var b = lines.slice(idx + 1).filter(function (l) { return !MARK.test(l); }).join("\n").trim();
      return a ? { short: a, more: b } : { short: b, more: "" };
    }
    var bl = toBlocks(norm);
    if (bl.length === 1) {
      var one = bl[0], ls = one.split("\n");
      if (ls.length > 4) return { short: ls.slice(0, 3).join("\n"), more: ls.slice(3).join("\n") };
      if (ls.length === 1 && one.length > 380) {
        var cut = one.lastIndexOf(". ", 260);
        if (cut > 80) return { short: one.slice(0, cut + 1), more: one.slice(cut + 2) };
      }
      return { short: norm, more: "" };
    }
    var take = 0, chars = 0;
    while (take < bl.length && (take === 0 || chars < 120)) { chars += bl[take].length; take++; }
    while (take < bl.length && isHeadBlock(bl[take - 1])) take++;
    if (take >= bl.length) return { short: norm, more: "" };
    return { short: bl.slice(0, take).join("\n\n"), more: bl.slice(take).join("\n\n") };
  }

  // ---------- Mətn: HTML ----------
  var BUL = /^(?:[-•*–—]|•)\s+/;
  var NUM = /^\d{1,2}[.)]\s+/;
  var NOTE = /^(?:Qeyd|Diqqət|Note|Примечание|Важно)\s*:/i;

  function inline(s) {
    return esc(s).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  }
  function ul(items) {
    return "<ul>" + items.map(function (x) { return "<li>" + inline(x.replace(BUL, "")) + "</li>"; }).join("") + "</ul>";
  }
  function rich(text) {
    var out = "", prevHead = false;
    toBlocks(text).forEach(function (b) {
      var lines = b.split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
      if (!lines.length) return;
      if (isHeadBlock(b)) {
        out += "<h4>" + esc(lines[0].replace(/:$/, "")) + "</h4>";
        prevHead = true;
        return;
      }
      // Başlıq və siyahı arasında boş sətir olmasa da başlıq tanınsın
      if (lines.length > 1 && /:$/.test(lines[0]) && lines[0].length <= 90 && !NOTE.test(lines[0])) {
        out += "<h4>" + esc(lines[0].replace(/:$/, "")) + "</h4>";
        lines = lines.slice(1);
        prevHead = true;
      }
      var allNum = lines.every(function (l) { return NUM.test(l); });
      var allBul = lines.every(function (l) { return BUL.test(l); });
      var shortAll = lines.length >= 3 && lines.every(function (l) { return l.length <= 70; });
      if (allNum) {
        out += '<ol class="pt-steps">' + lines.map(function (l) { return "<li><span>" + inline(l.replace(NUM, "")) + "</span></li>"; }).join("") + "</ol>";
      } else if (allBul) {
        out += ul(lines);
      } else if ((prevHead && lines.length >= 2) || shortAll) {
        var items = lines.slice(), tail = [];
        while (items.length > 1 && items[items.length - 1].length > 90) tail.unshift(items.pop());
        out += ul(items) + tail.map(function (l) { return "<p>" + inline(l) + "</p>"; }).join("");
      } else if (NOTE.test(lines[0])) {
        out += '<p class="pt-note">' + lines.map(inline).join("<br>") + "</p>";
      } else {
        out += "<p>" + lines.map(inline).join("<br>") + "</p>";
      }
      prevHead = false;
    });
    return out;
  }

  function toggleHtml(key, extra) {
    var open = !!expanded[key];
    return '<button type="button" class="pt-toggle" data-more="' + key + '" data-extra="' + (extra || "") + '" aria-expanded="' + open + '">' +
      "<span>" + esc(open ? t.less : t.more + (extra ? " (" + extra + ")" : "")) + '</span><i class="chev"></i></button>';
  }

  // ---------- Bölmələr ----------
  function getText(key) {
    var txt = pickText(data.content[key]);
    if (txt) return txt;
    if (key === "about") {
      var p = window.DB && DB.currentProduct;
      var d = p && p.description ? pickText(p.description) : "";
      var f = p && p.features ? ((p.features[lang] && p.features[lang].length ? p.features[lang] : p.features.az) || []) : [];
      var parts = [];
      if (d) parts.push(d);
      if (f.length) parts.push(t.adv + ":\n" + f.join("\n"));
      return parts.join("\n\n");
    }
    return (DEFAULTS[lang] || DEFAULTS.az)[key] || "";
  }

  function sectionHtml(key) {
    var txt = getText(key);
    if (!txt.trim()) return '<div class="muted">' + esc(t.soon) + "</div>";
    var p = split(txt);
    var open = !!expanded[key];
    return '<div class="pt-rich">' + rich(p.short) + "</div>" +
      (p.more
        ? '<div class="pt-more pt-rich" id="more-' + key + '"' + (open ? "" : " hidden") + ">" + rich(p.more) + "</div>" + toggleHtml(key)
        : "");
  }

  function reviewsHtml() {
    var s = data.stats || { count: 0, avg: 0 };
    var head = s.count
      ? '<div class="rv-sum"><span class="avg">' + esc(s.avg) + '</span><span class="stars">' + stars(s.avg) + '</span><span class="muted">(' + s.count + ")</span></div>"
      : "";
    var list = data.reviews || [];
    var items = list.map(function (r) {
      var text = r["body_" + lang] || r.body_az || r.body_en || r.body_ru || "";
      var date = r.review_date ? String(r.review_date).slice(0, 10) : "";
      return '<div class="rv"><div class="stars">' + stars(r.rating) + "</div><p>" + esc(text) + "</p>" +
        '<div class="who">' + esc(r.author_name) + (date ? " · " + esc(date) : "") + "</div></div>";
    });
    var rows;
    if (!items.length) {
      rows = '<div class="muted">' + esc(t.noRev) + "</div>";
    } else if (items.length <= SHOW_REVIEWS) {
      rows = items.join("");
    } else {
      var open = !!expanded.reviews;
      rows = items.slice(0, SHOW_REVIEWS).join("") +
        '<div id="more-reviews"' + (open ? "" : " hidden") + ">" + items.slice(SHOW_REVIEWS).join("") + "</div>" +
        toggleHtml("reviews", items.length - SHOW_REVIEWS);
    }
    return head + rows + formHtml();
  }

  function loadDraft() {
    try { var d = JSON.parse(lsGet(DRAFT_KEY) || "null"); return d && typeof d === "object" ? d : {}; } catch (e) { return {}; }
  }
  function saveDraft() {
    var ta = document.getElementById("rvText");
    var text = ta ? ta.value : (loadDraft().t || "");
    if (!rating && !text) { lsDel(DRAFT_KEY); return; }
    lsSet(DRAFT_KEY, JSON.stringify({ r: rating, t: text }));
  }
  function loginUrl() {
    return "login.html?next=" + encodeURIComponent("product.html?slug=" + slug + "&tab=reviews");
  }

  function formHtml() {
    if (sentMsg) return '<div class="ok" style="margin-top:14px">' + esc(sentMsg) + "</div>";
    if (user === undefined) return "";
    if (!user) {
      return '<div class="rv-form"><p class="muted" style="margin-bottom:10px">' + esc(t.login) + "</p>" +
        '<a class="btn gold" href="' + esc(loginUrl()) + '" data-keepdraft>' + esc(t.loginBtn) + "</a></div>";
    }
    var d = loadDraft();
    if (!rating && d.r) rating = Number(d.r) || 0;
    var pick = [1, 2, 3, 4, 5].map(function (n) {
      return '<button type="button" data-star="' + n + '" class="' + (n <= rating ? "on" : "") + '" aria-label="' + n + '">★</button>';
    }).join("");
    var warn = authLost
      ? '<div class="pt-warn">' + esc(t.relogin) + '<br><a class="btn gold" href="' + esc(loginUrl()) + '">' + esc(t.loginBtn) + "</a></div>"
      : "";
    var who = user && user.name ? '<div class="muted" style="font-size:13px;margin-top:4px">' + esc(t.as) + " <b>" + esc(user.name) + "</b></div>" : "";
    return '<div class="rv-form">' + warn + "<b>" + esc(t.write) + "</b>" + who +
      '<div class="muted" style="font-size:13px;margin-top:10px">' + esc(t.yourRating) + "</div>" +
      '<div class="starpick" role="group" aria-label="' + esc(t.yourRating) + '">' + pick + "</div>" +
      '<textarea id="rvText" maxlength="1000" placeholder="' + esc(t.ph) + '" aria-label="' + esc(t.yourText) + '">' + esc(d.t || "") + "</textarea>" +
      '<div class="cnt" id="rvCnt">' + String((d.t || "").length) + "/1000</div>" +
      '<div class="err-txt" id="rvErr"></div>' +
      '<button type="button" class="btn gold" id="rvSend">' + esc(t.send) + "</button></div>";
  }

  // ---------- Çəkmə ----------
  function build() {
    var sec = document.createElement("section");
    sec.id = "pTabs";
    sec.className = "ptabs";
    sec.innerHTML = '<div class="ptabs-nav" role="tablist">' + TABS.map(function (k) {
      return '<button type="button" role="tab" data-tab="' + k + '" aria-selected="' + (k === active) + '" class="' + (k === active ? "on" : "") + '">' + esc(t[k]) + "</button>";
    }).join("") + '</div><div class="ptabs-body" id="ptPanel" role="tabpanel"></div>';
    sec.addEventListener("click", onClick);
    return sec;
  }

  function buildReviews() {
    var sec = document.createElement("section");
    sec.id = "pReviews";
    sec.className = "ptabs";
    sec.innerHTML = '<h2 style="font-size:20px;margin-bottom:12px" id="rvHead">' + esc(t.reviews) + '</h2><div class="ptabs-body" id="rvPanel"></div>';
    sec.addEventListener("click", onClick);
    sec.addEventListener("input", onInput);
    return sec;
  }

  function paint(sec) {
    var panel = sec.querySelector("#ptPanel");
    if (!panel) return;
    if (!data) { panel.innerHTML = '<div class="muted">...</div>'; return; }
    panel.innerHTML = sectionHtml(active);
  }

  function paintReviews() {
    var rs = document.getElementById("pReviews");
    var panel = rs && rs.querySelector("#rvPanel");
    if (!panel) return;
    if (!data) { panel.innerHTML = '<div class="muted">...</div>'; return; }
    panel.innerHTML = reviewsHtml();
    var h = rs.querySelector("#rvHead");
    if (h) h.textContent = t.reviews + (data.stats && data.stats.count ? " (" + data.stats.count + ")" : "");
  }

  function onClick(e) {
    var el = e.target.closest("[data-tab],[data-more],[data-star],#rvSend,[data-keepdraft]");
    if (!el) return;
    var sec = el.closest("#pTabs") || el.closest("#pReviews");
    if (!sec) return;

    if (el.hasAttribute("data-tab")) {
      active = el.getAttribute("data-tab");
      sec.querySelectorAll("[data-tab]").forEach(function (b) {
        var on = b === el;
        b.classList.toggle("on", on);
        b.setAttribute("aria-selected", on ? "true" : "false");
      });
      paint(sec);
      return;
    }
    if (el.hasAttribute("data-more")) {
      var key = el.getAttribute("data-more");
      var more = document.getElementById("more-" + key);
      if (!more) return;
      expanded[key] = more.hasAttribute("hidden");
      if (expanded[key]) more.removeAttribute("hidden"); else more.setAttribute("hidden", "");
      var extra = el.getAttribute("data-extra");
      el.setAttribute("aria-expanded", expanded[key] ? "true" : "false");
      el.firstChild.textContent = expanded[key] ? t.less : t.more + (extra ? " (" + extra + ")" : "");
      return;
    }
    if (el.hasAttribute("data-star")) {
      rating = Number(el.getAttribute("data-star"));
      sec.querySelectorAll("[data-star]").forEach(function (b) {
        b.classList.toggle("on", Number(b.getAttribute("data-star")) <= rating);
      });
      saveDraft();
      return;
    }
    if (el.hasAttribute("data-keepdraft")) { saveDraft(); return; }
    if (el.id === "rvSend") submit(sec, el);
  }

  function onInput(e) {
    if (!e.target || e.target.id !== "rvText") return;
    var c = document.getElementById("rvCnt");
    if (c) c.textContent = e.target.value.length + "/1000";
    saveDraft();
  }

  async function submit(sec, btn) {
    var err = document.getElementById("rvErr");
    var text = document.getElementById("rvText").value.trim();
    if (!rating) { err.textContent = t.pickRating; return; }
    if (text.length < 5) { err.textContent = t.tooShort; return; }
    err.textContent = "";
    saveDraft();
    btn.disabled = true;
    btn.textContent = t.sending;
    var r = await DBApi.post("/api/shop?action=review", { product: slug, rating: rating, body: text });
    if (r.status === 401) {
      // Səhifədən atmırıq: rəy qaralamada saxlanılır, istifadəçi özü yenidən daxil olur
      authLost = true;
      paintReviews();
      var w = sec.querySelector(".pt-warn");
      if (w && w.scrollIntoView) w.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    if (r.status === 409) { lsDel(DRAFT_KEY); sentMsg = t.dup; paintReviews(); return; }
    if (!r.ok) {
      btn.disabled = false;
      btn.textContent = t.send;
      document.getElementById("rvErr").textContent = (r.data && r.data.error) || t.err;
      return;
    }
    lsDel(DRAFT_KEY);
    rating = 0;
    authLost = false;
    sentMsg = t.sent;
    paintReviews();
  }

  function emptyContent() { return { about: {}, usage: {}, howto: {} }; }

  function mount() {
    if (!box.querySelector(".order-box") || box.querySelector("#pTabs")) return;
    var sec = build();
    box.appendChild(sec);
    paint(sec);
    box.appendChild(buildReviews());
    paintReviews();
    if (data === null && !loading) {
      loading = true;
      fetch("/api/shop?action=extra&product=" + encodeURIComponent(slug))
        .then(function (r) { return r.json(); })
        .then(function (d) {
          data = { content: d.content || emptyContent(), reviews: d.reviews || [], stats: d.stats || { count: 0, avg: 0 } };
        })
        .catch(function () { data = { content: emptyContent(), reviews: [], stats: { count: 0, avg: 0 } }; })
        .then(function () {
          loading = false;
          var s = document.getElementById("pTabs"); if (s) paint(s);
          paintReviews();
          if (params.get("tab") === "reviews" && !scrolled) {
            scrolled = true;
            var rs = document.getElementById("pReviews");
            if (rs && rs.scrollIntoView) rs.scrollIntoView({ block: "start" });
          }
        });
    }
    if (user === undefined && window.DigiAuth) {
      DigiAuth.getSession().then(function (r) {
        user = r && r.session ? r.session.user : null;
        paintReviews();
      }).catch(function () { user = null; paintReviews(); });
    }
  }

  // product-page.js səhifəni hər dəfə yenidən çəkdikdə (məs. müddət seçiləndə) bölmə yenidən əlavə olunur
  new MutationObserver(mount).observe(box, { childList: true, subtree: true });
  mount();
})();

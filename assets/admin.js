(function () {
  var KEY = "digibaku_admin";
  var LABELS = { pending: "Cavab gözləyir", confirmed: "Təsdiqləndi", processing: "Hazırlanır",
    completed: "Hazırdır", cancelled: "Ləğv edildi" };
  var STATUSES = Object.keys(LABELS);
  var MONTHS = [1, 2, 3, 6, 12];
  var LANGS = { az: "Azərbaycan", ru: "Русский", en: "English" };
  var TITLES = { orders: "Sifarişlər", products: "Məhsullar", categories: "Kateqoriyalar", faq: "FAQ" };
  var INP = "width:100%;padding:9px;border-radius:10px;border:1px solid #262626;background:#1a1a1a;color:#f5f5f5;box-sizing:border-box";

  var list = document.getElementById("list");
  var msg = document.getElementById("msg");
  var login = document.getElementById("login");
  var pw = document.getElementById("pw");
  var side = document.getElementById("side");
  var nav = document.getElementById("nav");
  var secTitle = document.getElementById("secTitle");
  var logoutBtn = document.getElementById("logoutBtn");
  var CATS = [];
  var FAQ_LANG = "az";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function showMsg(t) { msg.textContent = t || ""; }
  function getTok() { return localStorage.getItem(KEY) || ""; }

  async function api(path, opts) {
    opts = opts || {};
    var headers = {};
    var tk = getTok();
    if (tk) headers.Authorization = "Bearer " + tk;
    if (opts.body) headers["Content-Type"] = "application/json";
    var r = await fetch(path, {
      method: opts.method || "GET",
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
    var data = await r.json().catch(function () { return {}; });
    return { ok: r.ok, status: r.status, data: data };
  }

  function setActive(sec) {
    nav.querySelectorAll("[data-sec]").forEach(function (b) {
      b.className = "ad-link" + (b.getAttribute("data-sec") === sec ? " on" : "");
    });
    secTitle.textContent = TITLES[sec] || "Admin";
    side.classList.remove("open");
  }

  function showLogin() {
    login.style.display = "";
    logoutBtn.style.display = "none";
    list.innerHTML = "";
    secTitle.textContent = "Admin girişi";
  }
  function expired() { localStorage.removeItem(KEY); showLogin(); showMsg("Sessiya bitib. Yenidən daxil olun."); }

  function go(sec) {
    setActive(sec);
    showMsg("");
    if (sec === "orders") loadOrders();
    else if (sec === "products") loadProducts();
    else if (sec === "categories") loadCategories();
    else if (sec === "faq") loadFaqs();
  }

  function fetchErr(r, fallback) {
    return (r.data && r.data.error) || fallback;
  }

  // ---------- SİFARİŞLƏR ----------
  function renderOrders(orders) {
    if (!orders.length) { list.innerHTML = '<div class="empty">Sifariş yoxdur.</div>'; return; }
    list.innerHTML = orders.map(function (o) {
      var items = (o.items || []).map(function (i) {
        return esc(i.name) + " · " + i.months + " ay × " + i.qty;
      }).join("<br>");
      var opts = STATUSES.map(function (s) {
        return '<option value="' + s + '"' + (s === o.status ? " selected" : "") + ">" + LABELS[s] + "</option>";
      }).join("");
      return '<div class="card-box" style="margin-bottom:10px">' +
        '<div style="display:flex;justify-content:space-between;gap:8px"><b>#' + esc(String(o.id).slice(0, 8)) +
        '</b><span class="price">' + Number(o.total).toFixed(2) + " AZN</span></div>" +
        '<p class="muted" style="font-size:13px">' + esc(o.email || "—") + " · " +
        esc(new Date(o.created_at).toLocaleString("az-AZ")) + "</p>" +
        '<p style="margin:6px 0">' + items + "</p>" +
        '<div style="display:flex;gap:8px;align-items:center">' +
        '<select data-id="' + esc(o.id) + '" style="' + INP + ';flex:1">' + opts + "</select>" +
        '<button class="btn gold" data-save="' + esc(o.id) + '">Saxla</button></div></div>';
    }).join("");

    list.querySelectorAll("[data-save]").forEach(function (b) {
      b.onclick = async function () {
        var id = b.getAttribute("data-save");
        var sel = list.querySelector('select[data-id="' + id + '"]');
        var r = await api("/api/admin?action=order_status", { method: "POST", body: { id: id, status: sel.value } });
        if (r.status === 401) { expired(); return; }
        if (!r.ok) { showMsg(fetchErr(r, "Xəta baş verdi.")); return; }
        showMsg("Yadda saxlandı: #" + id.slice(0, 8));
      };
    });
  }

  async function loadOrders() {
    list.innerHTML = '<div class="empty">Yüklənir...</div>';
    var r = await api("/api/admin?action=orders");
    if (r.status === 401) { expired(); return; }
    if (!r.ok) { showMsg(fetchErr(r, "Sifarişlər yüklənmədi.")); list.innerHTML = ""; return; }
    renderOrders(r.data.orders || []);
  }

  // ---------- MƏHSULLAR ----------
  function priceRow(p, m) {
    var price = p["price_" + m + "_month"];
    var sale = p["sale_" + m + "_price"];
    var on = p["sale_" + m + "_active"] === true;
    return '<div style="display:grid;grid-template-columns:52px 1fr 1fr auto;gap:6px;align-items:center;margin-bottom:6px">' +
      '<span class="muted">' + m + " ay</span>" +
      '<input data-f="price_' + m + '" type="number" step="0.01" min="0" placeholder="Qiymət" value="' +
        (price == null ? "" : esc(price)) + '" style="' + INP + '">' +
      '<input data-f="sale_' + m + '" type="number" step="0.01" min="0" placeholder="Satış" value="' +
        (sale == null ? "" : esc(sale)) + '" style="' + INP + '">' +
      '<label class="muted" style="font-size:12px"><input data-f="saleon_' + m + '" type="checkbox"' +
        (on ? " checked" : "") + "> endirim</label></div>";
  }

  function renderProducts(products) {
    if (!products.length) { list.innerHTML = '<div class="empty">Məhsul yoxdur.</div>'; return; }
    list.innerHTML = products.map(function (p) {
      var catOpts = CATS.map(function (c) {
        return '<option value="' + esc(c.key) + '"' + (c.key === p.category_key ? " selected" : "") + ">" +
          esc(c.name_az) + "</option>";
      }).join("");
      return '<div class="card-box" data-key="' + esc(p.product_key) + '" style="margin-bottom:12px">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px">' +
        '<b>' + esc(p.name_az) + '</b>' +
        '<label class="muted" style="font-size:13px"><input data-f="active" type="checkbox"' +
        (p.active ? " checked" : "") + "> aktiv</label></div>" +
        '<label class="muted" style="font-size:12px">Ad (AZ)</label>' +
        '<input data-f="name_az" value="' + esc(p.name_az) + '" style="' + INP + ';margin-bottom:6px">' +
        '<label class="muted" style="font-size:12px">Ad (RU)</label>' +
        '<input data-f="name_ru" value="' + esc(p.name_ru || "") + '" style="' + INP + ';margin-bottom:6px">' +
        '<label class="muted" style="font-size:12px">Ad (EN)</label>' +
        '<input data-f="name_en" value="' + esc(p.name_en || "") + '" style="' + INP + ';margin-bottom:6px">' +
        '<label class="muted" style="font-size:12px">Kateqoriya</label>' +
        '<select data-f="category_key" style="' + INP + ';margin-bottom:6px">' + catOpts + "</select>" +
        '<label class="muted" style="font-size:12px">Şəkil URL-i</label>' +
        '<input data-f="image_url" value="' + esc(p.image_url || "") + '" style="' + INP + ';margin-bottom:10px">' +
        '<div class="muted" style="font-size:12px;margin-bottom:6px">Müddət · Qiymət · Satış · Endirim</div>' +
        MONTHS.map(function (m) { return priceRow(p, m); }).join("") +
        '<button class="btn gold" data-psave="' + esc(p.product_key) + '" style="width:100%;margin-top:8px">Yadda saxla</button>' +
        "</div>";
    }).join("");

    list.querySelectorAll("[data-psave]").forEach(function (b) {
      b.onclick = function () { saveProduct(b.getAttribute("data-psave"), b); };
    });
  }

  function val(card, f) {
    var el = card.querySelector('[data-f="' + f + '"]');
    if (!el) return "";
    return el.type === "checkbox" ? el.checked : el.value;
  }

  async function saveProduct(key, btn) {
    var card = list.querySelector('[data-key="' + key + '"]');
    btn.disabled = true;
    showMsg("");
    var prod = await api("/api/admin?action=product_save", { method: "POST", body: {
      product_key: key,
      name_az: val(card, "name_az"),
      name_ru: val(card, "name_ru"),
      name_en: val(card, "name_en"),
      category_key: val(card, "category_key"),
      image_url: val(card, "image_url"),
      active: val(card, "active")
    } });
    if (prod.status === 401) { btn.disabled = false; expired(); return; }
    if (!prod.ok) { btn.disabled = false; showMsg(fetchErr(prod, "Məhsul yadda saxlanmadı.")); return; }

    var prices = {};
    MONTHS.forEach(function (m) {
      prices[m] = { price: val(card, "price_" + m), sale: val(card, "sale_" + m), saleActive: val(card, "saleon_" + m) };
    });
    var pr = await api("/api/admin?action=price_save", { method: "POST", body: { product_key: key, prices: prices } });
    btn.disabled = false;
    if (!pr.ok) { showMsg(fetchErr(pr, "Qiymət yadda saxlanmadı.")); return; }
    showMsg("Yadda saxlandı: " + key);
  }

  async function loadProducts() {
    list.innerHTML = '<div class="empty">Yüklənir...</div>';
    var r = await api("/api/admin?action=products");
    if (r.status === 401) { expired(); return; }
    if (!r.ok) { showMsg(fetchErr(r, "Məhsullar yüklənmədi.")); list.innerHTML = ""; return; }
    CATS = r.data.categories || [];
    renderProducts(r.data.products || []);
  }

  // ---------- KATEQORİYALAR ----------
  function catCard(c, isNew) {
    var key = c ? c.key : "";
    return '<div class="card-box" data-cat="' + esc(key) + '" style="margin-bottom:12px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px">' +
      '<b>' + (isNew ? "Yeni kateqoriya" : esc(c.name_az)) + "</b>" +
      '<label class="muted" style="font-size:13px"><input data-f="active" type="checkbox"' +
      (!c || c.active ? " checked" : "") + "> aktiv</label></div>" +
      '<label class="muted" style="font-size:12px">Açar (latın, məs: ai_tools)</label>' +
      '<input data-f="key" value="' + esc(key) + '"' + (isNew ? "" : " readonly") +
        ' style="' + INP + ';margin-bottom:6px;' + (isNew ? "" : "opacity:.6") + '">' +
      '<label class="muted" style="font-size:12px">Ad (AZ)</label>' +
      '<input data-f="name_az" value="' + esc(c ? c.name_az : "") + '" style="' + INP + ';margin-bottom:6px">' +
      '<label class="muted" style="font-size:12px">Ad (RU)</label>' +
      '<input data-f="name_ru" value="' + esc(c ? c.name_ru || "" : "") + '" style="' + INP + ';margin-bottom:6px">' +
      '<label class="muted" style="font-size:12px">Ad (EN)</label>' +
      '<input data-f="name_en" value="' + esc(c ? c.name_en || "" : "") + '" style="' + INP + ';margin-bottom:6px">' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">' +
      '<div><label class="muted" style="font-size:12px">İkon (emoji)</label>' +
      '<input data-f="icon" value="' + esc(c ? c.icon || "" : "") + '" style="' + INP + '"></div>' +
      '<div><label class="muted" style="font-size:12px">Sıra</label>' +
      '<input data-f="sort_order" type="number" value="' + esc(c ? c.sort_order : 0) + '" style="' + INP + '"></div></div>' +
      '<button class="btn gold" data-csave="1" style="width:100%">' + (isNew ? "Əlavə et" : "Yadda saxla") + "</button>" +
      "</div>";
  }

  function renderCategories(cats) {
    var html = catCard(null, true) + cats.map(function (c) { return catCard(c, false); }).join("");
    list.innerHTML = html || '<div class="empty">Kateqoriya yoxdur.</div>';
    list.querySelectorAll("[data-csave]").forEach(function (b) {
      b.onclick = function () { saveCategory(b.closest("[data-cat]"), b); };
    });
  }

  async function saveCategory(card, btn) {
    var isNew = card.querySelector("b").textContent === "Yeni kateqoriya";
    btn.disabled = true;
    showMsg("");
    var r = await api("/api/admin?action=category_save", { method: "POST", body: {
      key: val(card, "key"),
      name_az: val(card, "name_az"),
      name_ru: val(card, "name_ru"),
      name_en: val(card, "name_en"),
      icon: val(card, "icon"),
      sort_order: val(card, "sort_order"),
      active: val(card, "active")
    } });
    btn.disabled = false;
    if (r.status === 401) { expired(); return; }
    if (!r.ok) { showMsg(fetchErr(r, "Kateqoriya yadda saxlanmadı.")); return; }
    showMsg(isNew ? "Kateqoriya əlavə olundu." : "Yadda saxlandı.");
    loadCategories();
  }

  async function loadCategories() {
    list.innerHTML = '<div class="empty">Yüklənir...</div>';
    var r = await api("/api/admin?action=categories");
    if (r.status === 401) { expired(); return; }
    if (!r.ok) { showMsg(fetchErr(r, "Kateqoriyalar yüklənmədi.")); list.innerHTML = ""; return; }
    renderCategories(r.data.categories || []);
  }

  // ---------- FAQ ----------
  function faqCard(f, isNew) {
    var lang = f ? f.language : FAQ_LANG;
    var langOpts = Object.keys(LANGS).map(function (k) {
      return '<option value="' + k + '"' + (k === lang ? " selected" : "") + ">" + LANGS[k] + "</option>";
    }).join("");
    return '<div class="card-box" data-faq="' + esc(isNew ? "" : f.id) + '" style="margin-bottom:12px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px">' +
      '<b>' + (isNew ? "Yeni sual" : "Sual") + "</b>" +
      '<label class="muted" style="font-size:13px"><input data-f="active" type="checkbox"' +
      (!f || f.active ? " checked" : "") + "> aktiv</label></div>" +
      '<label class="muted" style="font-size:12px">Dil</label>' +
      '<select data-f="language" style="' + INP + ';margin-bottom:6px">' + langOpts + "</select>" +
      '<label class="muted" style="font-size:12px">Sual</label>' +
      '<textarea data-f="question" rows="2" style="' + INP + ';margin-bottom:6px">' + esc(f ? f.question : "") + "</textarea>" +
      '<label class="muted" style="font-size:12px">Cavab</label>' +
      '<textarea data-f="answer" rows="4" style="' + INP + ';margin-bottom:6px">' + esc(f ? f.answer : "") + "</textarea>" +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">' +
      '<div><label class="muted" style="font-size:12px">Sıra</label>' +
      '<input data-f="sort_order" type="number" value="' + esc(f ? f.sort_order : 0) + '" style="' + INP + '"></div>' +
      '<div style="display:flex;align-items:flex-end;gap:8px">' +
      '<button class="btn gold" data-fsave="1" style="flex:1">' + (isNew ? "Əlavə et" : "Yadda saxla") + "</button>" +
      (isNew ? "" : '<button class="btn" data-fdel="1" style="color:#f87171">Sil</button>') +
      "</div></div></div>";
  }

  function renderFaqs(faqs) {
    var rows = faqs.filter(function (f) { return f.language === FAQ_LANG; });
    var langBar = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">' +
      Object.keys(LANGS).map(function (k) {
        return '<button class="btn' + (k === FAQ_LANG ? " gold" : "") + '" data-flang="' + k + '">' + LANGS[k] + "</button>";
      }).join("") + "</div>";
    var html = langBar + '<button class="btn gold" data-fnew="1" style="width:100%;margin-bottom:12px">+ Yeni sual</button>';
    html += rows.map(function (f) { return faqCard(f, false); }).join("");
    list.innerHTML = html || '<div class="empty">Bu dildə sual yoxdur.</div>';

    list.querySelectorAll("[data-flang]").forEach(function (b) {
      b.onclick = function () { FAQ_LANG = b.getAttribute("data-flang"); loadFaqs(); };
    });
    var newBtn = list.querySelector("[data-fnew]");
    if (newBtn) newBtn.onclick = function () {
      newBtn.insertAdjacentHTML("afterend", faqCard(null, true));
      var card = newBtn.nextElementSibling;
      card.querySelector("[data-fsave]").onclick = function () { saveFaq(card, this); };
    };
    list.querySelectorAll("[data-faq]").forEach(function (card) {
      if (!card.getAttribute("data-faq")) return;
      card.querySelector("[data-fsave]").onclick = function () { saveFaq(card, this); };
      card.querySelector("[data-fdel]").onclick = function () { deleteFaq(card); };
    });
  }

  async function saveFaq(card, btn) {
    var id = card.getAttribute("data-faq") || "";
    btn.disabled = true;
    showMsg("");
    var r = await api("/api/admin?action=faq_save", { method: "POST", body: {
      id: id,
      language: val(card, "language"),
      question: val(card, "question"),
      answer: val(card, "answer"),
      sort_order: val(card, "sort_order"),
      active: val(card, "active")
    } });
    btn.disabled = false;
    if (r.status === 401) { expired(); return; }
    if (!r.ok) { showMsg(fetchErr(r, "Sual yadda saxlanmadı.")); return; }
    showMsg("Yadda saxlandı.");
    loadFaqs();
  }

  async function deleteFaq(card) {
    if (!confirm("Bu sual silinsin?")) return;
    var r = await api("/api/admin?action=faq_delete", { method: "POST", body: { id: card.getAttribute("data-faq") } });
    if (r.status === 401) { expired(); return; }
    if (!r.ok) { showMsg(fetchErr(r, "Silinmədi.")); return; }
    showMsg("Silindi.");
    loadFaqs();
  }

  async function loadFaqs() {
    list.innerHTML = '<div class="empty">Yüklənir...</div>';
    var r = await api("/api/admin?action=faqs");
    if (r.status === 401) { expired(); return; }
    if (!r.ok) { showMsg(fetchErr(r, "FAQ yüklənmədi.")); list.innerHTML = ""; return; }
    renderFaqs(r.data.faqs || []);
  }

  function val(card, f) {
    var el = card.querySelector('[data-f="' + f + '"]');
    if (!el) return "";
    return el.type === "checkbox" ? el.checked : el.value;
  }

  // ---------- GİRİŞ / BAŞLANĞIC ----------
  async function start() {
    try {
      var me = await api("/api/admin?action=me");
      if

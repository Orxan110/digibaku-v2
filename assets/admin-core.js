(function () {
  var KEY = "digibaku_admin";
  var LABELS = { pending: "Cavab gözləyir", confirmed: "Təsdiqləndi", processing: "Hazırlanır",
    completed: "Hazırdır", cancelled: "Ləğv edildi" };
  var STATUSES = Object.keys(LABELS);
  var MONTHS = [1, 2, 3, 6, 12];
  var TITLES = { orders: "Sifarişlər", products: "Məhsullar", categories: "Kateqoriyalar", faq: "FAQ" };
  var INP = "width:100%;padding:9px;border-radius:10px;border:1px solid #262626;background:#1a1a1a;color:#f5f5f5;box-sizing:border-box";

  var list = document.getElementById("list");
  var msg = document.getElementById("msg");
  var login = document.getElementById("login");
  var pw = document.getElementById("pw");
  var em = document.getElementById("em");
  var PRODUCTS = [];
  var side = document.getElementById("side");
  var nav = document.getElementById("nav");
  var secTitle = document.getElementById("secTitle");
  var logoutBtn = document.getElementById("logoutBtn");
  var CATS = [];

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function showMsg(t) { msg.textContent = t || ""; }
  function getTok() { return localStorage.getItem(KEY) || ""; }
  function fetchErr(r, fallback) { return (r.data && r.data.error) || fallback; }

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

  function val(card, f) {
    var el = card.querySelector('[data-f="' + f + '"]');
    if (!el) return "";
    return el.type === "checkbox" ? el.checked : el.value;
  }

  function slugify(s) {
    return String(s || "").toLowerCase()
      .replace(/ə/g, "e").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ü/g, "u")
      .replace(/ş/g, "s").replace(/ç/g, "c").replace(/ğ/g, "g")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  }

  function setActive(sec) {
    nav.querySelectorAll("[data-sec]").forEach(function (b) {
      b.className = "ad-link" + (b.getAttribute("data-sec") === sec ? " on" : "");
    });
    secTitle.textContent = TITLES[sec] || "Admin";
    side.classList.remove("open");
  }

  function showLogin() {
    document.body.classList.add("locked");
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
    else if (sec === "categories") window.AD.loadCategories();
    else if (sec === "faq") window.AD.loadFaqs();
  }

  // ---------- ŞƏKİL (telefon və ya kompüterdən) ----------
  // Şəkil brauzerdə kiçildilir (max 1000px), WEBP/JPEG olaraq saxlanılır, sonra serverə göndərilir
  function compressImage(file) {
    return new Promise(function (resolve, reject) {
      if (!file.type || file.type.indexOf("image/") !== 0) { reject(new Error("Yalnız şəkil faylı seçin.")); return; }
      var src = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(src);
        var w = img.naturalWidth, h = img.naturalHeight;
        var k = Math.min(1, 1000 / Math.max(w, h));
        var c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(w * k));
        c.height = Math.max(1, Math.round(h * k));
        var ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0, c.width, c.height);
        var out = c.toDataURL("image/webp", 0.88);
        if (out.indexOf("data:image/webp") !== 0) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, c.width, c.height);
          ctx.drawImage(img, 0, 0, c.width, c.height);
          out = c.toDataURL("image/jpeg", 0.88);
        }
        resolve(out);
      };
      img.onerror = function () { URL.revokeObjectURL(src); reject(new Error("Şəkil oxunmadı. Başqa fayl seçin.")); };
      img.src = src;
    });
  }

  async function uploadImage(file) {
    var dataUrl = await compressImage(file);
    var r = await api("/api/admin-products?action=image_upload", { method: "POST", body: { data: dataUrl } });
    if (r.status === 401) { expired(); return null; }
    if (!r.ok) throw new Error(fetchErr(r, "Şəkil yüklənmədi."));
    return r.data.url;
  }

  function fileRow(url) {
    var prev = '<img data-prev src="' + esc(url || "") + '" alt="" style="width:64px;height:64px;object-fit:contain;' +
      'border-radius:8px;background:#1a1a1a;border:1px solid #262626;flex:0 0 64px;' + (url ? "" : "display:none") + '">';
    return '<div style="display:flex;gap:10px;align-items:center;margin-bottom:10px">' + prev +
      '<label class="btn" style="flex:1;text-align:center;cursor:pointer;margin:0">📷 Şəkil seç (telefon və ya kompüter)' +
      '<input type="file" accept="image/*" data-file style="display:none"></label></div>';
  }

  function bindFiles(root) {
    root.querySelectorAll("[data-file]").forEach(function (input) {
      input.onchange = async function () {
        var f = input.files && input.files[0];
        if (!f) return;
        var box = input.closest("[data-box]");
        showMsg("Şəkil hazırlanır və yüklənir...");
        try {
          var url = await uploadImage(f);
          if (url) {
            box.querySelector('[data-f="image_url"]').value = url;
            var img = box.querySelector("[data-prev]");
            img.src = url;
            img.style.display = "";
            showMsg("Şəkil yükləndi. İndi 'Yadda saxla' düyməsinə basın.");
          }
        } catch (e) {
          showMsg(String(e && e.message || e));
        }
        input.value = "";
      };
    });
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

  function renderSortMode() {
    var items = PRODUCTS.slice();
    function move(i, to) {
      if (to < 0 || to >= items.length || i === to) return;
      var x = items.splice(i, 1)[0];
      items.splice(to, 0, x);
      draw();
    }
    function draw() {
      list.innerHTML =
        '<div class="card-box" style="margin-bottom:12px"><b>Məhsulların sırası</b>' +
        '<p class="muted" style="font-size:13px;margin:6px 0 10px">Ox düymələri ilə yerini dəyişin. Saytın ana səhifəsində və məhsullar bölməsində bu sıra ilə görünəcək (yuxarıdakı əvvəl çıxır).</p>' +
        '<div style="display:flex;gap:8px"><button class="btn gold" id="ordSave" style="flex:1">Sıranı yadda saxla</button>' +
        '<button class="btn" id="ordBack">Geri</button></div></div>' +
        items.map(function (p, i) {
          return '<div class="card-box" style="display:flex;align-items:center;gap:8px;padding:10px 12px;margin-bottom:6px">' +
            '<span class="muted" style="width:24px;font-size:13px">' + (i + 1) + '</span>' +
            '<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' + (p.active ? "" : ";opacity:.5") + '">' +
            esc(p.name_az) + (p.active ? "" : " (deaktiv)") + '</span>' +
            '<button class="btn" data-top="' + i + '" title="Ən yuxarı">⤒</button>' +
            '<button class="btn" data-up="' + i + '">▲</button>' +
            '<button class="btn" data-dn="' + i + '">▼</button></div>';
        }).join("");
      list.querySelectorAll("[data-top]").forEach(function (b) { b.onclick = function () { move(+b.getAttribute("data-top"), 0); }; });
      list.querySelectorAll("[data-up]").forEach(function (b) { b.onclick = function () { var i = +b.getAttribute("data-up"); move(i, i - 1); }; });
      list.querySelectorAll("[data-dn]").forEach(function (b) { b.onclick = function () { var i = +b.getAttribute("data-dn"); move(i, i + 1); }; });
      document.getElementById("ordBack").onclick = function () { loadProducts(); };
      document.getElementById("ordSave").onclick = async function () {
        this.disabled = true;
        var r = await api("/api/admin?action=product_reorder", { method: "POST", body: { order: items.map(function (p) { return p.product_key; }) } });
        if (r.status === 401) { expired(); return; }
        if (!r.ok) { this.disabled = false; showMsg(fetchErr(r, "Sıra yadda saxlanmadı.")); return; }
        await loadProducts();
        showMsg("Sıra yadda saxlandı.");
      };
    }
    draw();
  }

  function productCard(p) {
    var catOpts = CATS.map(function (c) {
      return '<option value="' + esc(c.key) + '"' + (c.key === p.category_key ? " selected" : "") + ">" +
        esc(c.name_az) + "</option>";
    }).join("");
    return '<div class="card-box" data-key="' + esc(p.product_key) + '" data-box="1" style="margin-bottom:12px">' +
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
      '<label class="muted" style="font-size:12px">Şəkil</label>' +
      fileRow(p.image_url) +
      '<input type="hidden" data-f="image_url" value="' + esc(p.image_url || "") + '">' +
      '<div class="muted" style="font-size:12px;margin-bottom:6px">Müddət · Qiymət · Satış · Endirim</div>' +
      MONTHS.map(function (m) { return priceRow(p, m); }).join("") +
      '<button class="btn gold" data-psave="' + esc(p.product_key) + '" style="width:100%;margin-top:8px">Yadda saxla</button>' +
      "</div>";
  }

  function renderProducts(products) {
    PRODUCTS = products;
    var bar = '<div style="display:flex;gap:8px;margin-bottom:12px">' +
      '<button class="btn gold" id="newBtn" style="flex:1">＋ Yeni məhsul</button>' +
      '<button class="btn gold" id="sortBtn" style="flex:1">↕ Sıranı dəyiş</button></div>';
    list.innerHTML = bar + (products.length ? products.map(productCard).join("") :
      '<div class="empty">Məhsul yoxdur.</div>');

    list.querySelectorAll("[data-psave]").forEach(function (b) {
      b.onclick = function () { saveProduct(b.getAttribute("data-psave"), b); };
    });
    bindFiles(list);
    document.getElementById("sortBtn").onclick = renderSortMode;
    document.getElementById("newBtn").onclick = renderNewProduct;
  }

  function renderNewProduct() {
    var catOpts = CATS.map(function (c) {
      return '<option value="' + esc(c.key) + '">' + esc(c.name_az) + "</option>";
    }).join("");
    list.innerHTML =
      '<div class="card-box" data-box="new" style="margin-bottom:12px"><b>Yeni məhsul</b>' +
      '<p class="muted" style="font-size:13px;margin:6px 0 10px">Məhsulu əlavə edin. Əlavə olunan məhsul siyahının sonuna düşəcək; sonra sıranı dəyişmək olar.</p>' +
      '<label class="muted" style="font-size:12px">Ad (AZ) *</label>' +
      '<input data-f="name_az" style="' + INP + ';margin-bottom:6px">' +
      '<label class="muted" style="font-size:12px">Ad (RU)</label>' +
      '<input data-f="name_ru" style="' + INP + ';margin-bottom:6px">' +
      '<label class="muted" style="font-size:12px">Ad (EN)</label>' +
      '<input data-f="name_en" style="' + INP + ';margin-bottom:6px">' +
      '<label class="muted" style="font-size:12px">Link adı (boş qalsa Ad EN-dən yaranır, məs: netflix-premium)</label>' +
      '<input data-f="slug" style="' + INP + ';margin-bottom:6px">' +
      '<label class="muted" style="font-size:12px">Kateqoriya</label>' +
      '<select data-f="category_key" style="' + INP + ';margin-bottom:6px">' + catOpts + "</select>" +
      '<label class="muted" style="font-size:12px">Şəkil</label>' +
      fileRow("") +
      '<input type="hidden" data-f="image_url" value="">' +
      '<label class="muted" style="font-size:13px;display:block;margin:6px 0 10px"><input data-f="active" type="checkbox" checked> aktiv (saytda görünsün)</label>' +
      '<div class="muted" style="font-size:12px;margin-bottom:6px">Müddət · Qiymət · Satış · Endirim</div>' +
      MONTHS.map(function (m) { return priceRow({}, m); }).join("") +
      '<div style="display:flex;gap:8px;margin-top:8px">' +
      '<button class="btn gold" id="newSave" style="flex:1">Məhsulu əlavə et</button>' +
      '<button class="btn" id="newBack">Geri</button></div></div>';

    bindFiles(list);
    document.getElementById("newBack").onclick = function () { loadProducts(); };
    document.getElementById("newSave").onclick = function () { createProduct(this); };
  }

  async function createProduct(btn) {
    var box = list.querySelector('[data-box="new"]');
    var nameAz = String(val(box, "name_az") || "").trim();
    if (!nameAz) { showMsg("Azərbaycanca ad daxil edin."); return; }
    var slug = slugify(val(box, "slug") || val(box, "name_en") || nameAz);
    if (!slug) { showMsg("Link adı yaratmaq olmadı. Ad (EN) və ya Link adı yazın (latın hərfləri ilə)."); return; }

    btn.disabled = true;
    showMsg("Məhsul yaradılır...");
    var created = await api("/api/admin-products?action=product_create", { method: "POST", body: {
      slug: slug,
      name_az: nameAz,
      name_ru: val(box, "name_ru"),
      name_en: val(box, "name_en"),
      category_key: val(box, "category_key"),
      image_url: val(box, "image_url"),
      active: val(box, "active")
    } });
    if (created.status === 401) { btn.disabled = false; expired(); return; }
    if (!created.ok) { btn.disabled = false; showMsg(fetchErr(created, "Məhsul yaradılmadı.")); return; }

    var key = created.data.product_key;
    var prices = {};
    MONTHS.forEach(function (m) {
      prices[m] = { price: val(box, "price_" + m), sale: val(box, "sale_" + m), saleActive: val(box, "saleon_" + m) };
    });
    var pr = await api("/api/admin?action=price_save", { method: "POST", body: { product_key: key, prices: prices } });
    btn.disabled = false;
    await loadProducts();
    if (!pr.ok) { showMsg("Məhsul yaradıldı, amma qiymət yadda saxlanmadı: " + fetchErr(pr, "")); return; }
    showMsg("Məhsul əlavə olundu: " + key);
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

  // ---------- GİRİŞ / BAŞLANĞIC ----------
  async function start() {
    try {
      var me = await api("/api/admin?action=me");
      if (me.status === 401) { localStorage.removeItem(KEY); showLogin(); showMsg(""); return; }
      login.style.display = "none";
      document.body.classList.remove("locked");
      logoutBtn.style.display = "";
      go("orders");
    } catch (e) {
      showMsg("Xəta: " + String(e && e.message || e));
    }
  }

  document.getElementById("loginBtn").onclick = async function () {
    showMsg("");
    try {
      var r = await fetch("/api/admin?action=login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: em.value, password: pw.value })
      });
      var d = await r.json().catch(function () { return {}; });
      if (!r.ok) { showMsg(d.error || "Xəta baş verdi."); return; }
      localStorage.setItem(KEY, d.token);
      pw.value = "";
      em.value = "";
      start();
    } catch (e) {
      showMsg("Xəta: " + String(e && e.message || e));
    }
  };

  [em, pw].forEach(function (el) {
    if (!el) return;
    el.addEventListener("keydown", function (e) {
      if (e.key === "Enter") document.getElementById("loginBtn").click();
    });
  });

  nav.addEventListener("click", function (e) {
    var b = e.target.closest("[data-sec]");
    if (b) go(b.getAttribute("data-sec"));
  });

  document.getElementById("menuBtn").onclick = function () { side.classList.toggle("open"); };

  logoutBtn.onclick = function () { localStorage.removeItem(KEY); showLogin(); showMsg("Çıxış edildi."); };

  window.AD = {
    list: list, msg: msg, esc: esc, api: api, val: val, showMsg: showMsg,
    fetchErr: fetchErr, expired: expired, INP: INP, MONTHS: MONTHS
  };

  document.addEventListener("DOMContentLoaded", function () {
    if (getTok()) start(); else showLogin();
  });
})();

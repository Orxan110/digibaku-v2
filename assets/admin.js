(function () {
  var KEY = "digibaku_admin";
  var LABELS = { pending: "Cavab gözləyir", confirmed: "Təsdiqləndi", processing: "Hazırlanır",
    completed: "Hazırdır", cancelled: "Ləğv edildi" };
  var STATUSES = Object.keys(LABELS);
  var MONTHS = [1, 2, 3, 6, 12];
  var INP = "width:100%;padding:9px;border-radius:10px;border:1px solid #262626;background:#1a1a1a;color:#f5f5f5;box-sizing:border-box";

  var list = document.getElementById("list");
  var msg = document.getElementById("msg");
  var login = document.getElementById("login");
  var pw = document.getElementById("pw");
  var tabs = document.getElementById("tabs");
  var tabOrders = document.getElementById("tabOrders");
  var tabProducts = document.getElementById("tabProducts");

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

  function showLogin() { login.style.display = ""; tabs.style.display = "none"; list.innerHTML = ""; }
  function expired() { localStorage.removeItem(KEY); showLogin(); showMsg("Sessiya bitib. Yenidən daxil olun."); }

  function setTab(name) {
    tabOrders.className = "btn" + (name === "orders" ? " gold" : "");
    tabProducts.className = "btn" + (name === "products" ? " gold" : "");
    showMsg("");
    if (name === "orders") loadOrders(); else loadProducts();
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
        '<select data-id="' + esc(o.id) + '" style="flex:1;padding:10px;border-radius:10px;background:#1a1a1a;color:#f5f5f5;border:1px solid #262626">' +
        opts + "</select>" +
        '<button class="btn gold" data-save="' + esc(o.id) + '">Saxla</button></div></div>';
    }).join("");

    list.querySelectorAll("[data-save]").forEach(function (b) {
      b.onclick = async function () {
        var id = b.getAttribute("data-save");
        var sel = list.querySelector('select[data-id="' + id + '"]');
        var r = await api("/api/admin?action=order_status", { method: "POST", body: { id: id, status: sel.value } });
        if (r.status === 401) { expired(); return; }
        if (!r.ok) { showMsg((r.data && r.data.error) || "Xəta baş verdi."); return; }
        showMsg("Yadda saxlandı: #" + id.slice(0, 8));
      };
    });
  }

  async function loadOrders() {
    list.innerHTML = '<div class="empty">Yüklənir...</div>';
    var r = await api("/api/admin?action=orders");
    if (r.status === 401) { expired(); return; }
    if (!r.ok) { showMsg((r.data && r.data.error) || "Sifarişlər yüklənmədi."); list.innerHTML = ""; return; }
    renderOrders(r.data.orders || []);
  }

  // ---------- MƏHSULLAR ----------
  var CATS = [];

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
    if (!prod.ok) { btn.disabled = false; showMsg((prod.data && prod.data.error) || "Məhsul yadda saxlanmadı."); return; }

    var prices = {};
    MONTHS.forEach(function (m) {
      prices[m] = { price: val(card, "price_" + m), sale: val(card, "sale_" + m), saleActive: val(card, "saleon_" + m) };
    });
    var pr = await api("/api/admin?action=price_save", { method: "POST", body: { product_key: key, prices: prices } });
    btn.disabled = false;
    if (!pr.ok) { showMsg((pr.data && pr.data.error) || "Qiymət yadda saxlanmadı."); return; }
    showMsg("Yadda saxlandı: " + key);
  }

  async function loadProducts() {
    list.innerHTML = '<div class="empty">Yüklənir...</div>';
    var r = await api("/api/admin?action=products");
    if (r.status === 401) { expired(); return; }
    if (!r.ok) { showMsg((r.data && r.data.error) || "Məhsullar yüklənmədi."); list.innerHTML = ""; return; }
    CATS = r.data.categories || [];
    renderProducts(r.data.products || []);
  }

  // ---------- GİRİŞ / BAŞLANĞIC ----------
  async function start() {
    try {
      var me = await api("/api/admin?action=me");
      if (me.status === 401) { localStorage.removeItem(KEY); showLogin(); showMsg(""); return; }
      login.style.display = "none";
      tabs.style.display = "flex";
      setTab("orders");
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
        body: JSON.stringify({ password: pw.value })
      });
      var d = await r.json().catch(function () { return {}; });
      if (!r.ok) { showMsg(d.error || "Xəta baş verdi."); return; }
      localStorage.setItem(KEY, d.token);
      pw.value = "";
      start();
    } catch (e) {
      showMsg("Xəta: " + String(e && e.message || e));
    }
  };

  tabOrders.onclick = function () { setTab("orders"); };
  tabProducts.onclick = function () { setTab("products"); };

  document.addEventListener("DOMContentLoaded", function () {
    if (getTok()) start(); else showLogin();
  });
})();

(function () {
  var AD = window.AD;
  if (!AD) return;
  var esc = AD.esc, api = AD.api, val = AD.val, showMsg = AD.showMsg;
  var fetchErr = AD.fetchErr, expired = AD.expired, INP = AD.INP, list = AD.list;
  var CUSTOMERS = [], CURRENT = null;
  var OSTATUS = { pending: "Cavab gözləyir", confirmed: "Təsdiqləndi", processing: "Hazırlanır",
    completed: "Hazırdır", cancelled: "Ləğv edildi" };

  function money(v) { return Number(v || 0).toFixed(2) + " AZN"; }
  function dt(v) { return v ? new Date(v).toLocaleString("az-AZ") : "—"; }

  function renderList(filter) {
    var q = (filter || "").toLowerCase();
    var rows = CUSTOMERS.filter(function (c) {
      return !q || String(c.email || "").toLowerCase().indexOf(q) !== -1 ||
        String(c.name || "").toLowerCase().indexOf(q) !== -1;
    });
    var head = '<input id="custSearch" placeholder="Ad və ya e-poçta görə axtar..." value="' + esc(filter || "") +
      '" style="' + INP + ';margin-bottom:12px">';
    var info = '<p class="muted" style="font-size:13px;margin-bottom:10px">Cəmi: ' + rows.length + " müştəri</p>";
    var body = rows.map(function (c) {
      return '<div class="card-box" style="margin-bottom:10px">' +
        '<b>' + esc(c.name || "—") + "</b>" + (c.blocked ? ' <span style="color:#f87171;font-size:12px">· bloklanıb</span>' : "") +
        '<div class="muted" style="font-size:13px;word-break:break-all">' + esc(c.email || "—") + "</div>" +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">' +
        '<div><span class="muted" style="font-size:12px">Sifariş</span><br><b>' + Number(c.order_count) + "</b></div>" +
        '<div><span class="muted" style="font-size:12px">Ümumi xərc</span><br><b class="price">' + money(c.total_spent) + "</b></div></div>" +
        '<p class="muted" style="font-size:12px;margin-top:8px">Son sifariş: ' + (c.last_order ? esc(dt(c.last_order)) : "Sifariş yoxdur") + "</p>" +
        '<button class="btn" type="button" data-cid="' + esc(c.id) + '" style="margin-top:8px">Profilə bax</button></div>';
    }).join("");
    list.innerHTML = head + info + (body || '<div class="empty">Müştəri tapılmadı.</div>');
    var search = document.getElementById("custSearch");
    if (search) {
      search.oninput = function () { renderList(this.value); };
      search.focus();
      search.setSelectionRange(search.value.length, search.value.length);
    }
  }

  async function loadCustomers() {
    CURRENT = null;
    list.innerHTML = '<div class="empty">Yüklənir...</div>';
    var r = await api("/api/admin?action=customers");
    if (r.status === 401) { expired(); return; }
    if (!r.ok) { showMsg(fetchErr(r, "Müştərilər yüklənmədi.")); list.innerHTML = ""; return; }
    CUSTOMERS = r.data.customers || [];
    renderList("");
  }

  function renderDetail(d) {
    var u = d.user, p = d.profile;
    var orders = d.orders.map(function (o) {
      var items = (o.items || []).map(function (i) { return esc(i.name) + " · " + i.months + " ay × " + i.qty; }).join("<br>");
      return '<div style="border-top:1px solid #262626;padding:8px 0">' +
        '<div style="display:flex;justify-content:space-between;gap:8px"><b>#' + esc(String(o.id).slice(0, 8)) + "</b>" +
        '<span class="price">' + money(o.total) + "</span></div>" +
        '<div class="muted" style="font-size:12px">' + esc(dt(o.created_at)) + " · " + esc(OSTATUS[o.status] || o.status) +
        (Number(o.discount_amount) > 0 ? " · kupon " + esc(o.coupon_code || "") + " (−" + money(o.discount_amount) + ")" : "") + "</div>" +
        '<div style="font-size:13px;margin-top:4px">' + items + "</div></div>";
    }).join("") || '<div class="empty">Sifariş yoxdur.</div>';
    var ledger = d.ledger.map(function (l) {
      return '<div style="border-top:1px solid #262626;padding:6px 0;font-size:13px">' +
        '<span style="color:' + (Number(l.amount) >= 0 ? "#4ade80" : "#f87171") + '">' +
        (Number(l.amount) >= 0 ? "+" : "") + money(l.amount) + "</span> · " + esc(l.reason || "—") +
        ' <span class="muted">' + esc(dt(l.created_at)) + "</span></div>";
    }).join("") || '<p class="muted" style="font-size:13px">Balans əməliyyatı yoxdur.</p>';

    list.innerHTML =
      '<button class="btn" type="button" data-back="1" style="margin-bottom:12px">← Müştərilər</button>' +
      '<div class="card-box" style="margin-bottom:12px"><b>' + esc(u.name || "—") + "</b>" +
      (p.blocked ? ' <span style="color:#f87171;font-size:12px">· bloklanıb</span>' : "") +
      '<div class="muted" style="font-size:13px;word-break:break-all">' + esc(u.email || "—") + "</div>" +
      '<p style="margin-top:8px"><span class="muted">Balans:</span> <b class="price">' + money(p.balance) + "</b></p></div>" +

      '<div class="card-box" style="margin-bottom:12px"><b>Qeyd və bloklama</b>' +
      '<textarea id="cpNote" rows="3" maxlength="2000" style="' + INP + ';margin-top:8px">' + esc(p.note || "") + "</textarea>" +
      '<label style="display:flex;gap:6px;align-items:center;margin:8px 0"><input id="cpBlocked" type="checkbox"' +
      (p.blocked ? " checked" : "") + "> Hesabı blokla (sifariş verə bilməz)</label>" +
      '<button class="btn gold" type="button" data-psave="1">Yadda saxla</button></div>' +

      '<div class="card-box" style="margin-bottom:12px"><b>Balans</b>' +
      '<div style="display:grid;grid-template-columns:1fr 2fr;gap:8px;margin-top:8px">' +
      '<input id="balAmt" type="number" step="0.01" placeholder="Məbləğ (məs: 10 və ya -5)" style="' + INP + '">' +
      '<input id="balReason" placeholder="Səbəb (məs: kompensasiya)" maxlength="200" style="' + INP + '"></div>' +
      '<button class="btn gold" type="button" data-bal="1" style="margin-top:8px">Tətbiq et</button>' +
      '<div style="margin-top:12px">' + ledger + "</div></div>" +

      '<div class="card-box"><b>Sifarişlər (' + d.orders.length + ")</b>" + orders + "</div>";
  }

  async function openCustomer(id) {
    showMsg("");
    list.innerHTML = '<div class="empty">Yüklənir...</div>';
    var r = await api("/api/admin?action=customer_detail&id=" + encodeURIComponent(id));
    if (r.status === 401) { expired(); return; }
    if (!r.ok) { showMsg(fetchErr(r, "Profil yüklənmədi.")); loadCustomers(); return; }
    CURRENT = id;
    renderDetail(r.data);
    window.scrollTo(0, 0);
  }

  list.addEventListener("click", async function (e) {
    var t = e.target;
    var cid = t.getAttribute("data-cid");
    if (cid) { openCustomer(cid); return; }
    if (t.getAttribute("data-back")) { loadCustomers(); return; }
    if (t.getAttribute("data-psave") && CURRENT) {
      showMsg("");
      var r = await api("/api/admin?action=customer_save", { method: "POST", body: {
        id: CURRENT, note: document.getElementById("cpNote").value,
        blocked: document.getElementById("cpBlocked").checked } });
      if (r.status === 401) { expired(); return; }
      if (!r.ok) { showMsg(fetchErr(r, "Yadda saxlanmadı.")); return; }
      showMsg("Profil yadda saxlanıldı.");
      openCustomer(CURRENT);
      return;
    }
    if (t.getAttribute("data-bal") && CURRENT) {
      showMsg("");
      var r2 = await api("/api/admin?action=customer_balance", { method: "POST", body: {
        id: CURRENT, amount: document.getElementById("balAmt").value,
        reason: document.getElementById("balReason").value } });
      if (r2.status === 401) { expired(); return; }
      if (!r2.ok) { showMsg(fetchErr(r2, "Balans dəyişmədi.")); return; }
      showMsg("Balans yeniləndi.");
      openCustomer(CURRENT);
    }
  });

  AD.loadCustomers = loadCustomers;

  document.getElementById("nav").addEventListener("click", function (e) {
    var b = e.target.closest('[data-sec="customers"]');
    if (!b) return;
    document.getElementById("secTitle").textContent = "Müştərilər";
    showMsg("");
    loadCustomers();
  });
})();

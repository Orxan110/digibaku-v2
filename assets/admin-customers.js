(function () {
  var AD = window.AD;
  if (!AD) return;
  var esc = AD.esc, api = AD.api, showMsg = AD.showMsg;
  var fetchErr = AD.fetchErr, expired = AD.expired, INP = AD.INP, list = AD.list;
  var CUSTOMERS = [];

  function render(filter) {
    var q = (filter || "").toLowerCase();
    var rows = CUSTOMERS.filter(function (c) {
      return !q || String(c.email || "").toLowerCase().indexOf(q) !== -1 ||
        String(c.name || "").toLowerCase().indexOf(q) !== -1;
    });
    var head = '<input id="custSearch" placeholder="Ad və ya e-poçta görə axtar..." value="' + esc(filter || "") +
      '" style="' + INP + ';margin-bottom:12px">';
    var info = '<p class="muted" style="font-size:13px;margin-bottom:10px">Cəmi: ' + rows.length + " müştəri</p>";
    var body = rows.map(function (c) {
      var last = c.last_order ? esc(new Date(c.last_order).toLocaleString("az-AZ")) : "Sifariş yoxdur";
      return '<div class="card-box" style="margin-bottom:10px">' +
        '<b>' + esc(c.name || "—") + "</b>" +
        '<div class="muted" style="font-size:13px;word-break:break-all">' + esc(c.email || "—") + "</div>" +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">' +
        '<div><span class="muted" style="font-size:12px">Sifariş</span><br><b>' + Number(c.order_count) + "</b></div>" +
        '<div><span class="muted" style="font-size:12px">Ümumi xərc</span><br><b class="price">' +
        Number(c.total_spent).toFixed(2) + " AZN</b></div></div>" +
        '<p class="muted" style="font-size:12px;margin-top:8px">Son sifariş: ' + last + "</p></div>";
    }).join("");
    list.innerHTML = head + info + (body || '<div class="empty">Müştəri tapılmadı.</div>');

    var search = document.getElementById("custSearch");
    if (search) {
      search.oninput = function () { render(this.value); };
      search.focus();
      search.setSelectionRange(search.value.length, search.value.length);
    }
  }

  async function loadCustomers() {
    list.innerHTML = '<div class="empty">Yüklənir...</div>';
    var r = await api("/api/admin?action=customers");
    if (r.status === 401) { expired(); return; }
    if (!r.ok) { showMsg(fetchErr(r, "Müştərilər yüklənmədi.")); list.innerHTML = ""; return; }
    CUSTOMERS = r.data.customers || [];
    render("");
  }

  AD.loadCustomers = loadCustomers;

  document.getElementById("nav").addEventListener("click", function (e) {
    var b = e.target.closest('[data-sec="customers"]');
    if (!b) return;
    document.getElementById("secTitle").textContent = "Müştərilər";
    showMsg("");
    loadCustomers();
  });
})();

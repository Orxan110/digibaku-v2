(function () {
  var AD = window.AD;
  if (!AD) return;
  var esc = AD.esc, api = AD.api, showMsg = AD.showMsg;
  var fetchErr = AD.fetchErr, expired = AD.expired, list = AD.list;
  var PATH = "/api/admin-stats?action=summary";
  var STATUS_LABEL = { pending: "Gözləyir", confirmed: "Təsdiqləndi", processing: "Hazırlanır",
    completed: "Hazırdır", cancelled: "Ləğv edildi" };

  function card(label, value) {
    return '<div class="card-box" style="flex:1;min-width:140px">' +
      '<span class="muted" style="font-size:12px">' + esc(label) + "</span>" +
      '<div style="font-size:22px;font-weight:800;color:#d4af37;margin-top:4px">' + value + "</div></div>";
  }

  function render(d) {
    var cards = '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px">' +
      card("Ümumi sifariş", d.orders) +
      card("Ümumi gəlir", Number(d.revenue).toFixed(2) + " AZN") +
      card("Müştəri", d.customers) +
      card("Gözləyən rəy", d.pendingReviews) + "</div>";

    var statuses = '<div class="card-box" style="margin-bottom:12px"><b>Status üzrə</b>' +
      (d.byStatus.length ? d.byStatus.map(function (s) {
        return '<div style="display:flex;justify-content:space-between;margin-top:6px"><span>' +
          esc(STATUS_LABEL[s.status] || s.status) + "</span><b>" + s.n + "</b></div>";
      }).join("") : '<p class="muted" style="margin-top:6px">Sifariş yoxdur.</p>') + "</div>";

    var days = '<div class="card-box" style="margin-bottom:12px"><b>Son 7 gün</b>' +
      (d.days.length ? d.days.map(function (x) {
        return '<div style="display:flex;justify-content:space-between;margin-top:6px"><span>' +
          esc(x.day) + "</span><span>" + x.orders + " sifariş · " + Number(x.revenue).toFixed(2) + " AZN</span></div>";
      }).join("") : '<p class="muted" style="margin-top:6px">Son 7 gündə sifariş yoxdur.</p>') + "</div>";

    var top = '<div class="card-box"><b>Ən çox satılan məhsullar</b>' +
      (d.top.length ? d.top.map(function (t, i) {
        return '<div style="display:flex;justify-content:space-between;gap:8px;margin-top:6px">' +
          '<span style="word-break:break-word">' + (i + 1) + ". " + esc(t.name) + "</span>" +
          "<b>" + t.qty + " ədəd</b></div>";
      }).join("") : '<p class="muted" style="margin-top:6px">Məlumat yoxdur.</p>') + "</div>";

    list.innerHTML = cards + statuses + days + top;
  }

  async function loadStats() {
    list.innerHTML = '<div class="empty">Yüklənir...</div>';
    var r = await api(PATH);
    if (r.status === 401) { expired(); return; }
    if (!r.ok) { showMsg(fetchErr(r, "Statistika yüklənmədi.")); list.innerHTML = ""; return; }
    render(r.data);
  }

  AD.loadStats = loadStats;

  document.getElementById("nav").addEventListener("click", function (e) {
    var b = e.target.closest('[data-sec="stats"]');
    if (!b) return;
    document.getElementById("secTitle").textContent = "Statistika";
    showMsg("");
    loadStats();
  });
})();

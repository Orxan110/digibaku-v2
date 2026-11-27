(function () {
  var AD = window.AD;
  if (!AD) return;
  var esc = AD.esc, api = AD.api, showMsg = AD.showMsg;
  var fetchErr = AD.fetchErr, expired = AD.expired, list = AD.list;

  function card(label, value) {
    return '<div class="card-box" style="flex:1;min-width:140px">' +
      '<span class="muted" style="font-size:12px">' + esc(label) + "</span>" +
      '<div style="font-size:22px;font-weight:800;color:#d4af37;margin-top:4px">' + value + "</div></div>";
  }

  function render(d) {
    var max = 1;
    d.days.forEach(function (x) { if (x.n > max) max = x.n; });
    var rows = d.days.map(function (x) {
      var w = Math.round(x.n / max * 100);
      return '<div style="display:flex;align-items:center;gap:8px;margin-top:6px;font-size:13px">' +
        '<span class="muted" style="width:92px">' + esc(x.day) + "</span>" +
        '<div style="flex:1;background:#262626;border-radius:6px;height:10px;overflow:hidden">' +
        '<div style="width:' + w + '%;height:100%;background:#d4af37"></div></div>' +
        '<b style="width:36px;text-align:right">' + x.n + "</b></div>";
    }).join("");
    list.innerHTML =
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px">' +
      card("Bu gün (unikal)", d.today) + card("Bu ay (unikal)", d.month) + "</div>" +
      '<div class="card-box"><b>Son 30 gün</b>' +
      (rows || '<p class="muted" style="margin-top:6px">Məlumat yoxdur.</p>') + "</div>" +
      '<p class="muted" style="font-size:12px;margin-top:10px">Ziyarətçilər cihaz üzrə anonim sayılır: hər cihaz gündə bir dəfə sayılır. Şəxsi məlumat saxlanmır.</p>';
  }

  async function load() {
    list.innerHTML = '<div class="empty">Yüklənir...</div>';
    var r = await api("/api/admin?action=visits");
    if (r.status === 401) { expired(); return; }
    if (!r.ok) { showMsg(fetchErr(r, "Statistika yüklənmədi.")); list.innerHTML = ""; return; }
    render(r.data);
  }

  document.getElementById("nav").addEventListener("click", function (e) {
    var b = e.target.closest('[data-sec="visits"]');
    if (!b) return;
    document.getElementById("secTitle").textContent = "Ziyarətçilər";
    showMsg("");
    load();
  });
})();

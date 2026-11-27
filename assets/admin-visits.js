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

  function td(v, right) {
    return '<td style="padding:6px 4px;border-top:1px solid #262626;' + (right ? "text-align:right;" : "") + '">' + v + "</td>";
  }

  function table(head, rows) {
    return '<table style="width:100%;font-size:13px;margin-top:8px;border-collapse:collapse">' +
      '<tr class="muted">' + head.map(function (h, i) {
        return '<th style="padding:6px 4px;' + (i ? "text-align:right;" : "text-align:left;") + '">' + h + "</th>";
      }).join("") + "</tr>" + rows + "</table>";
  }

  function render(d) {
    var daily = table(["Tarix", "Qeydiyyat", "Qeydiyyatlı giriş", "Qonaq giriş"],
      d.daily.map(function (x) {
        return "<tr>" + td(esc(x.day)) + td(x.registrations, true) + td(x.registered, true) + td(x.guests, true) + "</tr>";
      }).join(""));
    var months = table(["Ay", "Unikal", "Ziyarət"],
      d.months.map(function (m) {
        return "<tr>" + td(esc(m.month)) + td(m.uniq, true) + td(m.visits, true) + "</tr>";
      }).join(""));
    var users = d.users.map(function (u) {
      return '<div style="border-top:1px solid #262626;padding:8px 0;display:flex;justify-content:space-between;gap:8px;font-size:13px">' +
        '<div><b>' + esc(u.name || "—") + '</b><div class="muted" style="font-size:12px;word-break:break-all">' + esc(u.email || "") + "</div>" +
        '<div class="muted" style="font-size:12px">Qeydiyyat: ' + esc(u.registered_at || "—") + "</div></div>" +
        '<div style="text-align:right;white-space:nowrap"><b>' + u.days + ' gün</b><div class="muted" style="font-size:12px">' +
        esc(u.first_day) + " → " + esc(u.last_day) + "</div></div></div>";
    }).join("");
    list.innerHTML =
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px">' +
      card("Ümumi unikal ziyarətçi", d.total_unique) + card("Ümumi qeydiyyat", d.total_registered) +
      card("Bu gün", d.today) + card("Bu ay", d.month) + "</div>" +
      '<div class="card-box" style="margin-bottom:12px"><b>Gündəlik (sayt yarandığı gündən)</b>' +
      (d.daily.length ? daily : '<p class="muted" style="margin-top:6px">Məlumat yoxdur.</p>') + "</div>" +
      '<div class="card-box" style="margin-bottom:12px"><b>Aylıq statistika</b>' +
      (d.months.length ? months : '<p class="muted" style="margin-top:6px">Məlumat yoxdur.</p>') + "</div>" +
      '<div class="card-box"><b>Qeydiyyatlı istifadəçilər: neçə gün girib</b>' +
      (users || '<p class="muted" style="margin-top:6px">Məlumat yoxdur.</p>') + "</div>" +
      '<p class="muted" style="font-size:12px;margin-top:10px">Ziyarət hər cihaz üçün gündə bir dəfə sayılır. Məlumat silinmir. Qonaq girişləri anonimdir.</p>';
  }

  async function load() {
    list.innerHTML = '<div class="empty">Yüklənir...</div>';
    try {
      var r = await api("/api/admin?action=visits");
      if (r.status === 401) { expired(); return; }
      if (!r.ok) { showMsg(fetchErr(r, "Statistika yüklənmədi.")); list.innerHTML = ""; return; }
      render(r.data);
    } catch (e) {
      showMsg("Statistika göstərilə bilmədi: " + (e && e.message ? e.message : "naməlum xəta"));
      list.innerHTML = "";
    }
  }

  document.getElementById("nav").addEventListener("click", function (e) {
    var b = e.target.closest('[data-sec="visits"]');
    if (!b) return;
    document.getElementById("secTitle").textContent = "Ziyarətçilər";
    showMsg("");
    load();
  });
})();

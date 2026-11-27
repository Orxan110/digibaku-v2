(function () {
  var AD = window.AD;
  if (!AD) return;
  var esc = AD.esc, api = AD.api, val = AD.val, showMsg = AD.showMsg;
  var fetchErr = AD.fetchErr, expired = AD.expired, INP = AD.INP, list = AD.list;

  function dt(v) { return v ? new Date(v).toLocaleString("az-AZ") : "—"; }

  function render(d) {
    var ips = d.ips.map(function (x) {
      return '<div style="border-top:1px solid #262626;padding:8px 0;display:flex;justify-content:space-between;gap:8px;align-items:center">' +
        '<div><b>' + esc(x.ip) + '</b><div class="muted" style="font-size:12px">' + esc(x.reason || "—") + " · " + esc(dt(x.created_at)) + "</div></div>" +
        '<button class="btn" type="button" data-ipdel="' + esc(x.ip) + '" style="color:#f87171">Banı aç</button></div>';
    }).join("") || '<p class="muted" style="margin-top:6px">Banlanmış IP yoxdur.</p>';

    var users = d.users.map(function (u) {
      var btn = u.blocked
        ? '<button class="btn" type="button" data-uban="' + esc(u.user_id) + '" data-on="0">Hesab banını aç</button>'
        : '<button class="btn" type="button" data-uban="' + esc(u.user_id) + '" data-on="1" style="color:#f87171">Hesabı və IP-ni banla</button>';
      return '<div style="border-top:1px solid #262626;padding:8px 0">' +
        '<b>' + esc(u.name || "—") + "</b>" + (u.blocked ? ' <span style="color:#f87171;font-size:12px">· bloklanıb</span>' : "") +
        '<div class="muted" style="font-size:12px;word-break:break-all">' + esc(u.email || "") + " · son IP: " + esc(u.last_ip) + "</div>" +
        '<div style="margin-top:6px">' + btn + "</div></div>";
    }).join("") || '<p class="muted" style="margin-top:6px">IP məlumatı olan istifadəçi yoxdur.</p>';

    list.innerHTML =
      '<div class="card-box" style="margin-bottom:12px"><b>IP banı əlavə et</b>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">' +
      '<input id="banIp" placeholder="IP (məs: 185.12.34.56)" style="' + INP + '">' +
      '<input id="banReason" placeholder="Səbəb (ixtiyari)" maxlength="200" style="' + INP + '"></div>' +
      '<button class="btn gold" type="button" data-ipadd="1" style="margin-top:8px">Banla</button></div>' +
      '<div class="card-box" style="margin-bottom:12px"><b>Banlanmış IP-lər (' + d.ips.length + ")</b>" + ips + "</div>" +
      '<div class="card-box"><b>Son IP-si məlum istifadəçilər</b>' + users + "</div>" +
      '<p class="muted" style="font-size:12px;margin-top:10px">Banlanmış IP saytın səhifələrinə girə bilmir. Dəyişiklik təxminən 1 dəqiqə sonra qüvvəyə minir. Admin paneli bu banın xaricindədir.</p>';
  }

  async function load() {
    list.innerHTML = '<div class="empty">Yüklənir...</div>';
    var r = await api("/api/admin?action=bans");
    if (r.status === 401) { expired(); return; }
    if (!r.ok) { showMsg(fetchErr(r, "Siyahı yüklənmədi.")); list.innerHTML = ""; return; }
    render(r.data);
  }

  async function post(action, body, okMsg) {
    showMsg("");
    var r = await api("/api/admin?action=" + action, { method: "POST", body: body });
    if (r.status === 401) { expired(); return false; }
    if (!r.ok) { showMsg(fetchErr(r, "Əməliyyat alınmadı.")); return false; }
    showMsg(okMsg);
    return true;
  }

  list.addEventListener("click", async function (e) {
    var t = e.target;
    if (t.getAttribute("data-ipadd")) {
      var ip = (document.getElementById("banIp").value || "").trim();
      var reason = document.getElementById("banReason").value;
      if (await post("ban_add", { ip: ip, reason: reason }, "IP banlandı.")) load();
      return;
    }
    var del = t.getAttribute("data-ipdel");
    if (del) {
      if (!confirm(del + " üçün banı açılsın?")) return;
      if (await post("ban_remove", { ip: del }, "Ban açıldı.")) load();
      return;
    }
    var uid = t.getAttribute("data-uban");
    if (uid) {
      var on = t.getAttribute("data-on") === "1";
      if (on && !confirm("Hesab bloklansın və son IP də banlansın?")) return;
      if (await post("ban_user", { id: uid, ban: on }, on ? "Hesab və IP banlandı." : "Hesab banı açıldı.")) load();
    }
  });

  document.getElementById("nav").addEventListener("click", function (e) {
    var b = e.target.closest('[data-sec="bans"]');
    if (!b) return;
    document.getElementById("secTitle").textContent = "IP banları";
    showMsg("");
    load();
  });
})();

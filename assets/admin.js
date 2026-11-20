
(function () {
  var KEY = "digibaku_admin";
  var LABELS = { pending: "Cavab gözləyir", confirmed: "Təsdiqləndi", processing: "Hazırlanır",
    completed: "Hazırdır", cancelled: "Ləğv edildi" };
  var STATUSES = Object.keys(LABELS);
  var list = document.getElementById("list");
  var msg = document.getElementById("msg");
  var login = document.getElementById("login");
  var pw = document.getElementById("pw");

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

  function showLogin() { login.style.display = ""; list.innerHTML = ""; }

  function render(orders) {
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
        if (r.status === 401) { localStorage.removeItem(KEY); showLogin(); showMsg("Sessiya bitib. Yenidən daxil olun."); return; }
        if (!r.ok) { showMsg((r.data && r.data.error) || "Xəta baş verdi."); return; }
        showMsg("Yadda saxlandı: #" + id.slice(0, 8));
      };
    });
  }

  async function load() {
    try {
      var me = await api("/api/admin?action=me");
      if (me.status === 401) { localStorage.removeItem(KEY); showLogin(); showMsg(""); return; }
      login.style.display = "none";
      var r = await api("/api/admin?action=orders");
      if (!r.ok) { showMsg((r.data && r.data.error) || "Sifarişlər yüklənmədi."); list.innerHTML = ""; return; }
      showMsg("");
      render(r.data.orders || []);
    } catch (e) {
      showMsg("Xəta: " + String(e && e.message || e));
      list.innerHTML = "";
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
      load();
    } catch (e) {
      showMsg("Xəta: " + String(e && e.message || e));
    }
  };

  document.addEventListener("DOMContentLoaded", function () {
    if (getTok()) load(); else showLogin();
  });
})();

(function () {
  var LABELS = { pending: "Cavab gözləyir", confirmed: "Təsdiqləndi", processing: "Hazırlanır",
    completed: "Hazırdır", cancelled: "Ləğv edildi" };
  var STATUSES = Object.keys(LABELS);
  var list = document.getElementById("list");
  var msg = document.getElementById("msg");

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function showMsg(t) { msg.textContent = t || ""; }

  function getTok() {
    return localStorage.getItem("digibaku_token") || "";
  }

  async function api(action, opts) {
    opts = opts || {};
    var tk = getTok();
    if (!tk) return { ok: false, status: 401, data: { error: "Brauzerdə token yoxdur. Çıxış edib yenidən daxil olun." } };
    var headers = { Authorization: "Bearer " + tk };
    if (opts.body) headers["Content-Type"] = "application/json";
    var r = await fetch("/api/admin?action=" + action, {
      method: opts.method || "GET",
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
    var data = await r.json().catch(function () { return {}; });
    return { ok: r.ok, status: r.status, data: data };
  }

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
        var r = await api("order_status", { method: "POST", body: { id: id, status: sel.value } });
        if (!r.ok) { showMsg((r.data && r.data.error) || "Xəta baş verdi."); return; }
        showMsg("Yadda saxlandı: #" + id.slice(0, 8));
      };
    });
  }

  async function init() {
    try {
      var me = await api("me");
      if (me.status === 401) {
        list.innerHTML = '<div class="empty">Serverə daxil olmaq alınmadı.<br><br>' +
          esc((me.data && me.data.error) || "—") +
          '<br><br><a href="login.html">Yenidən daxil olun</a></div>';
        return;
      }
      if (me.status === 403) { list.innerHTML = '<div class="empty">Bu hesabda admin icazəsi yoxdur.</div>'; return; }
      if (!me.ok) { showMsg((me.data && me.data.error) || "Xəta"); list.innerHTML = ""; return; }
      var r = await api("orders");
      if (!r.ok) { showMsg((r.data && r.data.error) || "Sifarişlər yüklənmədi."); list.innerHTML = ""; return; }
      render(r.data.orders || []);
    } catch (e) {
      showMsg("Xəta: " + String(e && e.message || e));
      list.innerHTML = "";
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();

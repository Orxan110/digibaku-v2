(function () {
  var AD = window.AD;
  if (!AD) return;
  var esc = AD.esc, api = AD.api, showMsg = AD.showMsg;
  var fetchErr = AD.fetchErr, expired = AD.expired, INP = AD.INP, list = AD.list;
  var ITEMS = [];

  function dt(v) { return new Date(v).toLocaleString("az-AZ"); }
  function daysLeft(v) { return Math.max(0, Math.ceil((new Date(v).getTime() - Date.now()) / 86400000)); }

  function waLink(phone, it) {
    var digits = String(phone || "").replace(/\D/g, "");
    var who = it.user_name || "";
    var text = "Salam" + (who ? " " + who : "") + "! " + (it.name || "Abunəniz") +
      " abunəniz " + dt(it.ends_at).slice(0, 10) + " tarixində bitir (" + daysLeft(it.ends_at) +
      " gün qalıb). Yenidən sifariş vermək üçün saytımıza daxil olun: https://digibaku.com";
    return "https://wa.me/" + digits + "?text=" + encodeURIComponent(text);
  }

  function render() {
    var head = '<p class="muted" style="font-size:13px;margin-bottom:10px">Bitməyə 3 gün və ya az qalan abunələr: ' + ITEMS.length + "</p>";
    var body = ITEMS.map(function (it, i) {
      var phone = it.phone || "";
      var waBtn = phone
        ? '<a class="btn gold" target="_blank" rel="noopener" href="' + esc(waLink(phone, it)) + '">WhatsApp-da göndər</a>'
        : '<span class="muted" style="font-size:13px">Telefon yoxdur, aşağıda əlavə edin</span>';
      return '<div class="card-box" style="margin-bottom:10px">' +
        "<b>" + esc(it.user_name || "—") + "</b>" +
        '<div class="muted" style="font-size:13px;word-break:break-all">' + esc(it.email || "—") + "</div>" +
        '<p style="margin:6px 0">' + esc(it.name || "") + ' · <span style="color:#f59e0b">' + daysLeft(it.ends_at) +
        " gün qalıb</span></p>" +
        '<p class="muted" style="font-size:12px">Bitmə: ' + esc(dt(it.ends_at)) + "</p>" +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px">' + waBtn + "</div>" +
        '<div style="display:flex;gap:8px;margin-top:8px">' +
        '<input data-ph="' + i + '" value="' + esc(phone) + '" placeholder="+994501234567" style="' + INP + ';flex:1">' +
        '<button class="btn" type="button" data-sph="' + i + '">Telefonu saxla</button></div></div>';
    }).join("");
    list.innerHTML = head + (body || '<div class="empty">Yaxın vaxtda bitəcək abunə yoxdur.</div>');
  }

  async function load() {
    list.innerHTML = '<div class="empty">Yüklənir...</div>';
    var r = await api("/api/admin?action=expiring");
    if (r.status === 401) { expired(); return; }
    if (!r.ok) { showMsg(fetchErr(r, "Siyahı yüklənmədi.")); list.innerHTML = ""; return; }
    ITEMS = r.data.items || [];
    render();
  }

  list.addEventListener("click", async function (e) {
    var i = e.target.getAttribute("data-sph");
    if (i === null) return;
    var it = ITEMS[Number(i)];
    if (!it) return;
    var input = list.querySelector('[data-ph="' + i + '"]');
    showMsg("");
    var r = await api("/api/admin?action=customer_phone", { method: "POST", body: { id: it.user_id, phone: input.value } });
    if (r.status === 401) { expired(); return; }
    if (!r.ok) { showMsg(fetchErr(r, "Telefon saxlanmadı.")); return; }
    showMsg("Telefon saxlanıldı.");
    load();
  });

  document.getElementById("nav").addEventListener("click", function (e) {
    var b = e.target.closest('[data-sec="reminders"]');
    if (!b) return;
    document.getElementById("secTitle").textContent = "Abunə xatırlatması";
    showMsg("");
    load();
  });
})();

(function () {
  var AD = window.AD;
  if (!AD) return;
  var esc = AD.esc, api = AD.api, val = AD.val, showMsg = AD.showMsg;
  var fetchErr = AD.fetchErr, expired = AD.expired, INP = AD.INP, list = AD.list;

  function render(pct, rules) {
    list.innerHTML =
      '<div class="card-box" style="margin-bottom:12px"><b>Keşbek faizi</b>' +
      '<p class="muted" style="font-size:13px;margin:6px 0 10px">Müştəri sayt üzərindən sifariş verib sifariş "Ödənilib" və ya "Təhvil verildi" olanda, ödədiyi məbləğin bu faizi balansına əlavə olunur. Hər sifariş üçün yalnız bir dəfə hesablanır.</p>' +
      '<div style="display:flex;gap:8px;align-items:center"><input id="cbPct" type="number" min="0" max="50" step="0.5" value="' + esc(pct) + '" style="' + INP + ';flex:1">' +
      '<span class="muted">%</span></div>' +
      '<b style="display:block;margin-top:14px">Keşbek qaydaları</b>' +
      '<p class="muted" style="font-size:13px;margin:6px 0 8px">Bu mətn müştərinin profilindəki "Keşbek" bölməsində göstərilir. Hər sətir ayrıca bənd kimi görünür. Boş buraxsanız standart mətn göstərilir.</p>' +
      '<textarea id="cbRules" rows="6" maxlength="3000" style="' + INP + ';width:100%;min-height:120px">' + esc(rules || "") + '</textarea>' +
      '<button class="btn gold" type="button" data-cbsave="1" style="margin-top:10px">Yadda saxla</button></div>' +
      '<p class="muted" style="font-size:12px">Dəyişiklik yalnız bundan sonra ödənilən sifarişlərə təsir edir. Köhnə sifarişlərin keşbeki dəyişmir.</p>';
  }

  async function load() {
    list.innerHTML = '<div class="empty">Yüklənir...</div>';
    var r = await api("/api/admin?action=cashback");
    if (r.status === 401) { expired(); return; }
    if (!r.ok) { showMsg(fetchErr(r, "Keşbek faizi yüklənmədi.")); list.innerHTML = ""; return; }
    render(r.data.percent, r.data.rules);
  }

  list.addEventListener("click", async function (e) {
    if (!e.target.getAttribute("data-cbsave")) return;
    showMsg("");
    var pct = Number(document.getElementById("cbPct").value);
    var r = await api("/api/admin?action=cashback_set", { method: "POST", body: { percent: pct, rules: document.getElementById("cbRules").value } });
    if (r.status === 401) { expired(); return; }
    if (!r.ok) { showMsg(fetchErr(r, "Saxlanmadı.")); return; }
    showMsg("Keşbek faizi (" + pct + "%) və qaydalar saxlanıldı.");
    load();
  });

  document.getElementById("nav").addEventListener("click", function (e) {
    var b = e.target.closest('[data-sec="cashback"]');
    if (!b) return;
    document.getElementById("secTitle").textContent = "Keşbek";
    showMsg("");
    load();
  });
})();

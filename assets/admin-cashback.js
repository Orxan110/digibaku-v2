(function () {
  var AD = window.AD;
  if (!AD) return;
  var esc = AD.esc, api = AD.api, val = AD.val, showMsg = AD.showMsg;
  var fetchErr = AD.fetchErr, expired = AD.expired, INP = AD.INP, list = AD.list;

  function area(id, label, val, ph) {
    return '<label class="muted" style="display:block;font-size:12px;margin:8px 0 4px">' + label + '</label>' +
      '<textarea id="' + id + '" rows="6" maxlength="3000" placeholder="' + esc(ph || "") + '" style="' + INP + ';width:100%;min-height:110px">' + esc(val || "") + '</textarea>';
  }

  function render(d) {
    list.innerHTML =
      '<div class="card-box" style="margin-bottom:12px"><b>Keşbek faizi</b>' +
      '<p class="muted" style="font-size:13px;margin:6px 0 10px">Müştəri sayt üzərindən sifariş verib sifariş "Ödənilib" və ya "Təhvil verildi" olanda, ödədiyi məbləğin bu faizi balansına əlavə olunur. Hər sifariş üçün yalnız bir dəfə hesablanır.</p>' +
      '<div style="display:flex;gap:8px;align-items:center"><input id="cbPct" type="number" min="0" max="50" step="0.5" value="' + esc(d.percent) + '" style="' + INP + ';flex:1">' +
      '<span class="muted">%</span></div></div>' +

      '<div class="card-box" style="margin-bottom:12px"><b>Keşbek qaydaları (3 dildə)</b>' +
      '<p class="muted" style="font-size:13px;margin:6px 0 0">Bütün istifadəçilərə profildəki "Keşbek" bölməsində göstərilir. Hər sətir ayrıca bənd kimi görünür. Boş buraxsanız həmin dil üçün standart mətn göstərilir.</p>' +
      area("cbRulesAz", "🇦🇿 Azərbaycanca", d.rules) +
      area("cbRulesRu", "🇷🇺 Русский", d.rules_ru) +
      area("cbRulesEn", "🇬🇧 English", d.rules_en) + '</div>' +

      '<div class="card-box" style="margin-bottom:12px"><b>Balans artırma qaydası (3 dildə)</b>' +
      '<p class="muted" style="font-size:13px;margin:6px 0 0">Bütün istifadəçilərə profildəki "Balans" bölməsində göstərilir (məs. hansı karta/nömrəyə köçürmək, çek göndərmək). Hər sətir ayrıca bənd kimi görünür. Boş buraxsanız standart mətn göstərilir.</p>' +
      area("cbTopAz", "🇦🇿 Azərbaycanca", d.topup_az) +
      area("cbTopRu", "🇷🇺 Русский", d.topup_ru) +
      area("cbTopEn", "🇬🇧 English", d.topup_en) +
      '<button class="btn gold" type="button" data-cbsave="1" style="margin-top:12px">Yadda saxla</button></div>' +
      '<p class="muted" style="font-size:12px">Faiz dəyişikliyi yalnız bundan sonra ödənilən sifarişlərə təsir edir. Köhnə sifarişlərin keşbeki dəyişmir.</p>';
  }

  async function load() {
    list.innerHTML = '<div class="empty">Yüklənir...</div>';
    var r = await api("/api/admin?action=cashback");
    if (r.status === 401) { expired(); return; }
    if (!r.ok) { showMsg(fetchErr(r, "Keşbek faizi yüklənmədi.")); list.innerHTML = ""; return; }
    render(r.data);
  }

  list.addEventListener("click", async function (e) {
    if (!e.target.getAttribute("data-cbsave")) return;
    showMsg("");
    var pct = Number(document.getElementById("cbPct").value);
    var g = function (id) { return document.getElementById(id).value; };
    var r = await api("/api/admin?action=cashback_set", { method: "POST", body: {
      percent: pct, rules: g("cbRulesAz"), rules_ru: g("cbRulesRu"), rules_en: g("cbRulesEn"),
      topup_az: g("cbTopAz"), topup_ru: g("cbTopRu"), topup_en: g("cbTopEn") } });
    if (r.status === 401) { expired(); return; }
    if (!r.ok) { showMsg(fetchErr(r, "Saxlanmadı.")); return; }
    var ok = false;
    try {
      var chk = await fetch("/api/shop?action=cashback_info&_=" + Date.now(), { cache: "no-store" });
      var cj = await chk.json();
      ok = !!(cj && cj.cashback && Number(cj.cashback.percent) === pct &&
        cj.cashback.rules === g("cbRulesAz").slice(0, 3000) && cj.cashback.topup_az === g("cbTopAz").slice(0, 3000));
    } catch (e2) {}
    showMsg("Keşbek faizi (" + pct + "%), qaydalar və balans artırma təlimatı saxlanıldı." +
      (ok ? " ✓ Saytda (wallet.html və profil) dərhal görünür." : " Diqqət: saytdan yoxlama uğursuz oldu, səhifəni yeniləyib yenidən yoxlayın."));
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

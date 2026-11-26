(function () {
  var AD = window.AD;
  if (!AD) return;
  var esc = AD.esc, api = AD.api, val = AD.val, showMsg = AD.showMsg;
  var fetchErr = AD.fetchErr, expired = AD.expired, INP = AD.INP, list = AD.list;
  var COUPONS = [], EDIT = null;

  function fld(label, f, v, readonly, type) {
    return '<div><label class="muted" style="font-size:12px">' + label + "</label>" +
      '<input data-f="' + f + '" type="' + (type || "text") + '" value="' + esc(v == null ? "" : v) + '"' +
      (readonly ? " readonly" : "") + ' style="' + INP + '"></div>';
  }

  // ISO vaxtı Bakı vaxtı üçün datetime-local formatına çevirir (UTC+4)
  function localInput(iso) {
    if (!iso) return "";
    var d = new Date(new Date(iso).getTime() + 4 * 3600 * 1000);
    return d.toISOString().slice(0, 16);
  }

  function status(c) {
    if (!c.active) return ["Söndürülüb", "#9ca3af"];
    if (c.expires_at && new Date(c.expires_at) < new Date()) return ["Müddəti bitib", "#f87171"];
    if (c.max_uses && c.used_count >= c.max_uses) return ["Limit dolub", "#f87171"];
    return ["Aktiv", "#4ade80"];
  }

  function valueText(c) {
    return c.kind === "percent" ? Number(c.value) + "%" : Number(c.value).toFixed(2) + " AZN";
  }

  function formHtml(c) {
    var isEdit = !!c;
    return '<div class="card-box" id="cpForm" style="margin-bottom:14px"><b>' +
      (isEdit ? "Kuponu redaktə et: " + esc(c.code) : "Yeni kupon") + "</b>" +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px">' +
      fld("Kod (məs: YENI10)", "code", c ? c.code : "", isEdit) +
      '<div><label class="muted" style="font-size:12px">Tip</label><select data-f="kind" style="' + INP + '">' +
      '<option value="percent">Faiz (%)</option><option value="fixed">Sabit (AZN)</option></select></div>' +
      fld("Dəyər", "value", c ? c.value : "", false, "number") +
      fld("Minimum səbət (AZN, boş = yoxdur)", "min_total", c ? Number(c.min_total) : "", false, "number") +
      fld("Ümumi istifadə limiti (boş = limitsiz)", "max_uses", c ? c.max_uses : "", false, "number") +
      fld("Bitmə tarixi (Bakı vaxtı, boş = müddətsiz)", "expires_at", c ? localInput(c.expires_at) : "", false, "datetime-local") +
      "</div>" +
      '<label style="display:flex;gap:6px;align-items:center;margin:10px 0"><input data-f="active" type="checkbox"> Aktiv</label>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn gold" id="cpSave" type="button">Yadda saxla</button>' +
      (isEdit ? '<button class="btn" id="cpReset" type="button">Ləğv et</button>' : "") + "</div></div>";
  }

  function render() {
    list.innerHTML = formHtml(EDIT) + '<p class="muted" style="font-size:13px;margin-bottom:10px">Kuponlar: ' + COUPONS.length + "</p>" +
      (COUPONS.map(function (c) {
        var s = status(c);
        return '<div class="card-box" style="margin-bottom:10px">' +
          '<div style="display:flex;justify-content:space-between;gap:8px"><b>' + esc(c.code) + "</b>" +
          '<span style="color:' + s[1] + ';font-size:13px">' + s[0] + "</span></div>" +
          '<p class="muted" style="font-size:13px;margin:6px 0">' + (c.kind === "percent" ? "Faiz" : "Sabit") + " · " + valueText(c) +
          " · min " + Number(c.min_total).toFixed(2) + " AZN · istifadə: " + c.used_count + (c.max_uses ? " / " + c.max_uses : "") +
          " · bitir: " + (c.expires_at ? new Date(c.expires_at).toLocaleString("az-AZ") : "yoxdur") + "</p>" +
          '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
          '<button class="btn" type="button" data-ce="' + esc(c.code) + '">Redaktə</button>' +
          '<button class="btn" type="button" data-ct="' + esc(c.code) + '">' + (c.active ? "Söndür" : "Aktiv et") + "</button>" +
          (c.used_count === 0 ? '<button class="btn" type="button" data-cd="' + esc(c.code) + '" style="color:#f87171">Sil</button>' : "") +
          "</div></div>";
      }).join("") || '<div class="empty">Kupon yoxdur.</div>');

    var form = document.getElementById("cpForm");
    if (form) {
      form.querySelector('[data-f="kind"]').value = EDIT ? EDIT.kind : "percent";
      form.querySelector('[data-f="active"]').checked = EDIT ? !!EDIT.active : true;
    }
  }

  function collect() {
    var f = document.getElementById("cpForm");
    return {
      code: val(f, "code"), kind: val(f, "kind"), value: val(f, "value"), min_total: val(f, "min_total"),
      max_uses: val(f, "max_uses"), expires_at: val(f, "expires_at"), active: val(f, "active")
    };
  }

  async function loadCoupons() {
    list.innerHTML = '<div class="empty">Yüklənir...</div>';
    var r = await api("/api/admin?action=coupons");
    if (r.status === 401) { expired(); return; }
    if (!r.ok) { showMsg(fetchErr(r, "Kuponlar yüklənmədi.")); list.innerHTML = ""; return; }
    COUPONS = r.data.coupons || [];
    render();
  }

  async function save(body) {
    showMsg("");
    var r = await api("/api/admin?action=coupon_save", { method: "POST", body: body });
    if (r.status === 401) { expired(); return false; }
    if (!r.ok) { showMsg(fetchErr(r, "Kupon saxlanmadı.")); return false; }
    return true;
  }

  list.addEventListener("click", async function (e) {
    var t = e.target;
    if (t.id === "cpSave") {
      if (await save(collect())) { showMsg("Kupon saxlanıldı."); EDIT = null; loadCoupons(); }
      return;
    }
    if (t.id === "cpReset") { EDIT = null; render(); return; }
    var code;
    if ((code = t.getAttribute("data-ce"))) {
      EDIT = COUPONS.find(function (c) { return c.code === code; }) || null;
      render();
      var f = document.getElementById("cpForm");
      if (f) f.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if ((code = t.getAttribute("data-ct"))) {
      var c = COUPONS.find(function (x) { return x.code === code; });
      if (!c) return;
      var body = { code: c.code, kind: c.kind, value: c.value, min_total: c.min_total, max_uses: c.max_uses,
        expires_at: c.expires_at, active: !c.active };
      if (await save(body)) loadCoupons();
      return;
    }
    if ((code = t.getAttribute("data-cd"))) {
      if (!confirm("“" + code + "” kuponu silinsin?")) return;
      showMsg("");
      var r = await api("/api/admin?action=coupon_delete", { method: "POST", body: { code: code } });
      if (r.status === 401) { expired(); return; }
      if (!r.ok) { showMsg(fetchErr(r, "Kupon silinmədi.")); return; }
      EDIT = null;
      loadCoupons();
    }
  });

  AD.loadCoupons = loadCoupons;

  document.getElementById("nav").addEventListener("click", function (e) {
    var b = e.target.closest('[data-sec="coupons"]');
    if (!b) return;
    document.getElementById("secTitle").textContent = "Kuponlar";
    showMsg("");
    EDIT = null;
    loadCoupons();
  });
})();

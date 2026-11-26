(function () {
  var AD = window.AD;
  if (!AD) return;
  var esc = AD.esc, api = AD.api, val = AD.val, showMsg = AD.showMsg;
  var fetchErr = AD.fetchErr, expired = AD.expired, INP = AD.INP, list = AD.list;
  var MONTHS = [1, 2, 3, 6, 12];
  var DISCOUNTS = [], EDIT = null;

  function localInput(iso) {
    if (!iso) return "";
    return new Date(new Date(iso).getTime() + 4 * 3600 * 1000).toISOString().slice(0, 16);
  }

  function status(d) {
    var now = new Date();
    if (!d.active) return ["Söndürülüb", "#9ca3af"];
    if (new Date(d.ends_at) <= now) return ["Bitib", "#9ca3af"];
    if (new Date(d.starts_at) > now) return ["Gözlənilir", "#f59e0b"];
    return ["Aktiv", "#4ade80"];
  }

  function fld(label, f, v, type) {
    return '<div><label class="muted" style="font-size:12px">' + label + "</label>" +
      '<input data-f="' + f + '" type="' + (type || "text") + '" value="' + esc(v == null ? "" : v) + '" style="' + INP + '"></div>';
  }

  function formHtml(d) {
    var isEdit = !!d;
    var monthBoxes = MONTHS.map(function (m) {
      var on = !d || !d.months || d.months.indexOf(m) !== -1;
      return '<label style="display:flex;gap:4px;align-items:center"><input type="checkbox" data-m="' + m + '"' + (on ? " checked" : "") + "> " + m + " ay</label>";
    }).join("");
    return '<div class="card-box" id="dcForm" style="margin-bottom:14px"><b>' +
      (isEdit ? "Endirimi redaktə et" : "Yeni planlı endirim") + "</b>" +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px">' +
      fld("Ad (məs: Cümə endirimi)", "name", d ? d.name : "") +
      fld("Faiz (%)", "percent", d ? Number(d.percent) : "", "number") +
      fld("Başlama tarixi (Bakı vaxtı)", "starts_at", d ? localInput(d.starts_at) : "", "datetime-local") +
      fld("Bitmə tarixi (Bakı vaxtı)", "ends_at", d ? localInput(d.ends_at) : "", "datetime-local") +
      "</div>" +
      '<div style="margin-top:8px"><label class="muted" style="font-size:12px">Məhsul açarları (vergüllə, boş = bütün məhsullar)</label>' +
      '<input data-f="product_keys" value="' + esc(d && d.product_keys ? d.product_keys.join(", ") : "") + '" placeholder="məs: netflix, chatgpt-plus" style="' + INP + '"></div>' +
      '<div style="margin-top:8px"><label class="muted" style="font-size:12px">Müddətlər (heç biri seçilməsə, hamısı)</label>' +
      '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:4px">' + monthBoxes + "</div></div>" +
      '<label style="display:flex;gap:6px;align-items:center;margin:10px 0"><input data-f="active" type="checkbox"> Aktiv</label>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn gold" id="dcSave" type="button">Yadda saxla</button>' +
      (isEdit ? '<button class="btn" id="dcReset" type="button">Ləğv et</button>' : "") + "</div></div>";
  }

  function render() {
    list.innerHTML = formHtml(EDIT) +
      '<p class="muted" style="font-size:13px;margin-bottom:10px">Endirimlər: ' + DISCOUNTS.length + "</p>" +
      (DISCOUNTS.map(function (d) {
        var s = status(d);
        var scope = d.product_keys && d.product_keys.length ? d.product_keys.join(", ") : "bütün məhsullar";
        var mon = d.months && d.months.length ? d.months.join(", ") + " ay" : "bütün müddətlər";
        return '<div class="card-box" style="margin-bottom:10px">' +
          '<div style="display:flex;justify-content:space-between;gap:8px"><b>' + esc(d.name) + " — " + Number(d.percent) + "%</b>" +
          '<span style="color:' + s[1] + ';font-size:13px">' + s[0] + "</span></div>" +
          '<p class="muted" style="font-size:13px;margin:6px 0">' + esc(scope) + " · " + esc(mon) +
          "<br>" + new Date(d.starts_at).toLocaleString("az-AZ") + " → " + new Date(d.ends_at).toLocaleString("az-AZ") + "</p>" +
          '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
          '<button class="btn" type="button" data-de="' + d.id + '">Redaktə</button>' +
          '<button class="btn" type="button" data-dt="' + d.id + '">' + (d.active ? "Söndür" : "Aktiv et") + "</button>" +
          '<button class="btn" type="button" data-dd="' + d.id + '" style="color:#f87171">Sil</button></div></div>';
      }).join("") || '<div class="empty">Planlı endirim yoxdur.</div>');
    var f = document.getElementById("dcForm");
    if (f) f.querySelector('[data-f="active"]').checked = EDIT ? !!EDIT.active : true;
  }

  function collect() {
    var f = document.getElementById("dcForm");
    var months = [];
    f.querySelectorAll("[data-m]").forEach(function (c) { if (c.checked) months.push(Number(c.getAttribute("data-m"))); });
    // Bütün müddətlər seçilibsə, "hamısı" kimi boş göndəririk
    if (months.length === MONTHS.length) months = [];
    var keys = String(val(f, "product_keys") || "").split(",").map(function (x) { return x.trim(); }).filter(Boolean);
    return {
      id: EDIT ? EDIT.id : "", name: val(f, "name"), percent: val(f, "percent"),
      starts_at: val(f, "starts_at"), ends_at: val(f, "ends_at"),
      product_keys: keys, months: months, active: val(f, "active")
    };
  }

  async function save(body) {
    showMsg("");
    var r = await api("/api/admin?action=discount_save", { method: "POST", body: body });
    if (r.status === 401) { expired(); return false; }
    if (!r.ok) { showMsg(fetchErr(r, "Endirim saxlanmadı.")); return false; }
    return true;
  }

  async function loadDiscounts() {
    list.innerHTML = '<div class="empty">Yüklənir...</div>';
    var r = await api("/api/admin?action=discounts");
    if (r.status === 401) { expired(); return; }
    if (!r.ok) { showMsg(fetchErr(r, "Endirimlər yüklənmədi.")); list.innerHTML = ""; return; }
    DISCOUNTS = r.data.discounts || [];
    render();
  }

  list.addEventListener("click", async function (e) {
    var t = e.target;
    if (t.id === "dcSave") {
      if (await save(collect())) { showMsg("Endirim saxlanıldı."); EDIT = null; loadDiscounts(); }
      return;
    }
    if (t.id === "dcReset") { EDIT = null; render(); return; }
    var id;
    if ((id = t.getAttribute("data-de"))) {
      EDIT = DISCOUNTS.find(function (d) { return String(d.id) === id; }) || null;
      render();
      var f = document.getElementById("dcForm");
      if (f) f.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if ((id = t.getAttribute("data-dt"))) {
      var d = DISCOUNTS.find(function (x) { return String(x.id) === id; });
      if (!d) return;
      var body = { id: d.id, name: d.name, percent: d.percent, product_keys: d.product_keys || [], months: d.months || [],
        starts_at: d.starts_at, ends_at: d.ends_at, active: !d.active };
      if (await save(body)) loadDiscounts();
      return;
    }
    if ((id = t.getAttribute("data-dd"))) {
      if (!confirm("Bu planlı endirim silinsin?")) return;
      showMsg("");
      var r = await api("/api/admin?action=discount_delete", { method: "POST", body: { id: id } });
      if (r.status === 401) { expired(); return; }
      if (!r.ok) { showMsg(fetchErr(r, "Endirim silinmədi.")); return; }
      EDIT = null;
      loadDiscounts();
    }
  });

  AD.loadDiscounts = loadDiscounts;

  document.getElementById("nav").addEventListener("click", function (e) {
    var b = e.target.closest('[data-sec="discounts"]');
    if (!b) return;
    document.getElementById("secTitle").textContent = "Planlı endirim";
    showMsg("");
    EDIT = null;
    loadDiscounts();
  });
})();

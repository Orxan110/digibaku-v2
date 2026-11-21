(function () {
  var AD = window.AD;
  if (!AD) return;
  var esc = AD.esc, api = AD.api, val = AD.val, showMsg = AD.showMsg;
  var fetchErr = AD.fetchErr, expired = AD.expired, INP = AD.INP, list = AD.list;
  var PATH = "/api/admin-settings?action=";

  var GROUPS = [
    { title: "Sayt haqqında", fields: [
      ["site_name", "Saytın adı"], ["logo_text", "Logo mətni"]
    ] },
    { title: "Ünvan və iş saatları", fields: [
      ["city_az", "Şəhər (AZ)"], ["city_ru", "Şəhər (RU)"], ["city_en", "Şəhər (EN)"],
      ["hours_az", "İş saatları (AZ)"], ["hours_ru", "İş saatları (RU)"], ["hours_en", "İş saatları (EN)"]
    ] },
    { title: "Əlaqə", fields: [
      ["whatsapp", "WhatsApp nömrəsi (məs: +994501234567)"], ["phone", "Əlaqə telefonu"], ["email", "E-poçt"]
    ] },
    { title: "Sosial şəbəkələr", fields: [
      ["instagram", "Instagram profil linki (https://...)"], ["tiktok", "TikTok profil linki (https://...)"]
    ] }
  ];

  function field(key, label, v) {
    return '<label class="muted" style="font-size:12px">' + esc(label) + "</label>" +
      '<input data-f="' + key + '" value="' + esc(v || "") + '" style="' + INP + ';margin-bottom:8px">';
  }

  function render(s) {
    var html = '<div class="card-box" style="margin-bottom:12px">' +
      '<p class="muted" style="font-size:13px">Bu məlumatlar bütün saytda avtomatik yenilənir: header, footer, məhsul səhifələri, əlaqə səhifəsi və WhatsApp keçidləri.</p></div>';
    GROUPS.forEach(function (g) {
      html += '<div class="card-box" style="margin-bottom:12px"><b>' + esc(g.title) + "</b>" +
        '<div style="margin-top:8px">' +
        g.fields.map(function (f) { return field(f[0], f[1], s[f[0]]); }).join("") +
        "</div></div>";
    });
    html += '<button class="btn gold" data-ssave="1" style="width:100%;margin-bottom:20px">Yadda saxla</button>';
    list.innerHTML = html;
    list.querySelector("[data-ssave]").onclick = save;
  }

  function collect() {
    var out = {};
    GROUPS.forEach(function (g) {
      g.fields.forEach(function (f) { out[f[0]] = val(list, f[0]); });
    });
    return out;
  }

  async function save() {
    var btn = list.querySelector("[data-ssave]");
    btn.disabled = true;
    showMsg("");
    var r = await api(PATH + "save", { method: "POST", body: collect() });
    btn.disabled = false;
    if (r.status === 401) { expired(); return; }
    if (!r.ok) { showMsg(fetchErr(r, "Parametrlər yadda saxlanmadı.")); return; }
    showMsg("Yadda saxlandı. Saytda dəyişiklik bir neçə saniyə ərzində görünəcək.");
  }

  async function loadSettings() {
    list.innerHTML = '<div class="empty">Yüklənir...</div>';
    var r = await api(PATH + "get");
    if (r.status === 401) { expired(); return; }
    if (!r.ok) { showMsg(fetchErr(r, "Parametrlər yüklənmədi.")); list.innerHTML = ""; return; }
    render(r.data.settings || {});
  }

  AD.loadSettings = loadSettings;

  document.getElementById("nav").addEventListener("click", function (e) {
    var b = e.target.closest('[data-sec="settings"]');
    if (!b) return;
    document.getElementById("secTitle").textContent = "Sayt parametrləri";
    showMsg("");
    loadSettings();
  });
})();

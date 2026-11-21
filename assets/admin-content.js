(function () {
  var AD = window.AD;
  if (!AD) return;
  var esc = AD.esc, api = AD.api, showMsg = AD.showMsg;
  var fetchErr = AD.fetchErr, expired = AD.expired, INP = AD.INP, list = AD.list;
  var PATH = "/api/admin-faq?action=";
  var LANGS = { az: "Azərbaycan", ru: "Русский", en: "English" };
  var SECTIONS = [
    ["about", "Məhsul haqqında"],
    ["usage", "İstifadə qaydaları"],
    ["howto", "Necə sifariş edim?"]
  ];
  var PRODUCTS = [];
  var CUR = "";
  var LANG = "az";
  var DATA = {};

  function collect() {
    list.querySelectorAll("[data-c]").forEach(function (el) { DATA[el.getAttribute("data-c")] = el.value; });
  }

  function render() {
    var opts = '<option value="">— Məhsul seçin —</option>' + PRODUCTS.map(function (p) {
      return '<option value="' + esc(p.product_key) + '"' + (p.product_key === CUR ? " selected" : "") + ">" + esc(p.name_az) + "</option>";
    }).join("");
    var html = '<div class="card-box" style="margin-bottom:12px">' +
      '<p class="muted" style="font-size:13px;margin-bottom:8px">Hər məhsul üçün öz mətnləri yazılır. Boş qalan hissə saytda “tezliklə əlavə olunacaq” kimi görünür.</p>' +
      '<select id="cProd" style="' + INP + '">' + opts + "</select></div>";
    if (CUR) {
      html += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">' +
        Object.keys(LANGS).map(function (k) {
          return '<button class="btn' + (k === LANG ? " gold" : "") + '" data-clang="' + k + '">' + LANGS[k] + "</button>";
        }).join("") + "</div>";
      html += '<div class="card-box">' + SECTIONS.map(function (s) {
        return '<label class="muted" style="font-size:12px">' + s[1] + " (" + LANG.toUpperCase() + ")</label>" +
          '<textarea data-c="' + s[0] + "_" + LANG + '" rows="6" style="' + INP + ';margin-bottom:10px">' +
          esc(DATA[s[0] + "_" + LANG] || "") + "</textarea>";
      }).join("") + '<button class="btn gold" id="cSave" style="width:100%">Yadda saxla (bütün dillər)</button></div>';
    }
    list.innerHTML = html;

    document.getElementById("cProd").onchange = function () { CUR = this.value; DATA = {}; if (CUR) loadContent(); else render(); };
    list.querySelectorAll("[data-clang]").forEach(function (b) {
      b.onclick = function () { collect(); LANG = b.getAttribute("data-clang"); render(); };
    });
    var sv = document.getElementById("cSave");
    if (sv) sv.onclick = save;
  }

  async function save() {
    collect();
    var body = { product_key: CUR };
    SECTIONS.forEach(function (s) {
      Object.keys(LANGS).forEach(function (l) { body[s[0] + "_" + l] = DATA[s[0] + "_" + l] || ""; });
    });
    var btn = document.getElementById("cSave");
    btn.disabled = true;
    var r = await api(PATH + "content_save", { method: "POST", body: body });
    btn.disabled = false;
    if (r.status === 401) { expired(); return; }
    if (!r.ok) { showMsg(fetchErr(r, "Yadda saxlanmadı.")); return; }
    showMsg("Yadda saxlandı.");
  }

  async function loadContent() {
    list.innerHTML = '<div class="empty">Yüklənir...</div>';
    var r = await api(PATH + "content_get&product_key=" + encodeURIComponent(CUR));
    if (r.status === 401) { expired(); return; }
    if (!r.ok) { showMsg(fetchErr(r, "Məzmun yüklənmədi.")); return; }
    DATA = r.data.content || {};
    render();
  }

  async function load() {
    list.innerHTML = '<div class="empty">Yüklənir...</div>';
    var p = await api(PATH + "products");
    if (p.status === 401) { expired(); return; }
    PRODUCTS = (p.ok && p.data.products) || [];
    CUR = ""; DATA = {};
    render();
  }

  document.getElementById("nav").addEventListener("click", function (e) {
    if (!e.target.closest('[data-sec="content"]')) return;
    document.getElementById("secTitle").textContent = "Məhsul məzmunu";
    showMsg("");
    load();
  });
})();

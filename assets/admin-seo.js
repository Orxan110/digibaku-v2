(function () {
  var AD = window.AD;
  if (!AD) return;
  var esc = AD.esc, api = AD.api, val = AD.val, showMsg = AD.showMsg;
  var fetchErr = AD.fetchErr, expired = AD.expired, INP = AD.INP, list = AD.list;
  var PATH = "/api/admin-settings?action=";
  var PAGES = [["default", "Ümumi"], ["home", "Ana səhifə"], ["products", "Məhsullar"], ["faq", "FAQ"],
    ["contact", "Əlaqə"], ["about", "Haqqımızda"], ["rules", "Qaydalar"], ["privacy", "Məxfilik"], ["terms", "Şərtlər"]];
  var LANGS = [["az", "Azərbaycan"], ["ru", "Русский"], ["en", "English"]];
  var CUR = "default";
  var ALL = {};

  function render() {
    var s = ALL[CUR] || {};
    var tabs = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">' +
      PAGES.map(function (x) {
        return '<button class="btn' + (x[0] === CUR ? " gold" : "") + '" data-pg="' + x[0] + '">' + esc(x[1]) + "</button>";
      }).join("") + "</div>";
    var hint = '<p class="muted" style="font-size:13px;margin-bottom:12px">' +
      (CUR === "default"
        ? "Ümumi dəyərlər: konkret səhifədə boş qalan sahələr üçün istifadə olunur."
        : "Boş qalan sahə üçün \"Ümumi\" bölməsindəki dəyər istifadə olunur.") +
      " Tövsiyə: başlıq 60, təsvir 160 simvola qədər.</p>";
    var blocks = LANGS.map(function (l) {
      return '<div class="card-box" style="margin-bottom:12px"><b>' + esc(l[1]) + "</b>" +
        '<label class="muted" style="font-size:12px;display:block;margin-top:8px">SEO başlığı</label>' +
        '<input data-f="title_' + l[0] + '" value="' + esc(s["title_" + l[0]] || "") + '" style="' + INP + ';margin-bottom:8px">' +
        '<label class="muted" style="font-size:12px">Meta təsvir</label>' +
        '<textarea data-f="desc_' + l[0] + '" rows="3" style="' + INP + ';margin-bottom:8px">' + esc(s["desc_" + l[0]] || "") + "</textarea>" +
        '<label class="muted" style="font-size:12px">Açar sözlər (vergüllə ayırın)</label>' +
        '<input data-f="keywords_' + l[0] + '" value="' + esc(s["keywords_" + l[0]] || "") + '" style="' + INP + '"></div>';
    }).join("");
    var img = '<div class="card-box" style="margin-bottom:12px"><b>Paylaşım şəkli (Open Graph)</b>' +
      '<label class="muted" style="font-size:12px;display:block;margin-top:8px">Şəkil linki (məs: /assets/img/netflix.webp)</label>' +
      '<input data-f="og_image" value="' + esc(s.og_image || "") + '" style="' + INP + '"></div>';
    list.innerHTML = tabs + hint + blocks + img +
      '<button class="btn gold" data-ssave="1" style="width:100%;margin-bottom:20px">Yadda saxla</button>';

    list.querySelectorAll("[data-pg]").forEach(function (b) {
      b.onclick = function () { CUR = b.getAttribute("data-pg"); render(); };
    });
    list.querySelector("[data-ssave]").onclick = save;
  }

  async function save() {
    var btn = list.querySelector("[data-ssave]");
    var body = { key: CUR, og_image: val(list, "og_image") };
    LANGS.forEach(function (l) {
      body["title_" + l[0]] = val(list, "title_" + l[0]);
      body["desc_" + l[0]] = val(list, "desc_" + l[0]);
      body["keywords_" + l[0]] = val(list, "keywords_" + l[0]);
    });
    btn.disabled = true;
    showMsg("");
    var r = await api(PATH + "seo_save", { method: "POST", body: body });
    btn.disabled = false;
    if (r.status === 401) { expired(); return; }
    if (!r.ok) { showMsg(fetchErr(r, "SEO yadda saxlanmadı.")); return; }
    ALL[CUR] = body;
    showMsg("Yadda saxlandı.");
  }

  async function load() {
    list.innerHTML = '<div class="empty">Yüklənir...</div>';
    var r = await api(PATH + "seo_get");
    if (r.status === 401) { expired(); return; }
    if (!r.ok) { showMsg(fetchErr(r, "SEO yüklənmədi.")); list.innerHTML = ""; return; }
    ALL = r.data.seo || {};
    render();
  }

  AD.loadSeo = load;

  document.getElementById("nav").addEventListener("click", function (e) {
    var b = e.target.closest('[data-sec="seo"]');
    if (!b) return;
    document.getElementById("secTitle").textContent = "SEO";
    showMsg("");
    load();
  });
})();

(function () {
  var AD = window.AD;
  if (!AD) return;
  var esc = AD.esc, api = AD.api, val = AD.val, showMsg = AD.showMsg;
  var fetchErr = AD.fetchErr, expired = AD.expired, INP = AD.INP, list = AD.list;
  var PATH = "/api/admin-settings?action=";
  var PAGES = [["about", "Haqqımızda"], ["rules", "Sifariş qaydaları"], ["privacy", "Məxfilik"], ["terms", "Şərtlər"]];
  var LANGS = [["az", "Azərbaycan"], ["ru", "Русский"], ["en", "English"]];
  var CUR = "about";

  function render(p) {
    var tabs = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">' +
      PAGES.map(function (x) {
        return '<button class="btn' + (x[0] === CUR ? " gold" : "") + '" data-pg="' + x[0] + '">' + esc(x[1]) + "</button>";
      }).join("") + "</div>";
    var hint = '<p class="muted" style="font-size:13px;margin-bottom:12px">Abzasları boş sətirlə ayırın. Boş qalan dil üçün Azərbaycan mətni göstərilir.</p>';
    var blocks = LANGS.map(function (l) {
      return '<div class="card-box" style="margin-bottom:12px"><b>' + esc(l[1]) + "</b>" +
        '<label class="muted" style="font-size:12px;display:block;margin-top:8px">Başlıq</label>' +
        '<input data-f="title_' + l[0] + '" value="' + esc(p["title_" + l[0]] || "") + '" style="' + INP + ';margin-bottom:8px">' +
        '<label class="muted" style="font-size:12px">Mətn</label>' +
        '<textarea data-f="body_' + l[0] + '" rows="10" style="' + INP + '">' + esc(p["body_" + l[0]] || "") + "</textarea></div>";
    }).join("");
    list.innerHTML = tabs + hint + blocks +
      '<button class="btn gold" data-psave="1" style="width:100%;margin-bottom:20px">Yadda saxla</button>';

    list.querySelectorAll("[data-pg]").forEach(function (b) {
      b.onclick = function () { CUR = b.getAttribute("data-pg"); load(); };
    });
    list.querySelector("[data-psave]").onclick = save;
  }

  async function save() {
    var btn = list.querySelector("[data-psave]");
    var body = { key: CUR };
    LANGS.forEach(function (l) {
      body["title_" + l[0]] = val(list, "title_" + l[0]);
      body["body_" + l[0]] = val(list, "body_" + l[0]);
    });
    btn.disabled = true;
    showMsg("");
    var r = await api(PATH + "page_save", { method: "POST", body: body });
    btn.disabled = false;
    if (r.status === 401) { expired(); return; }
    if (!r.ok) { showMsg(fetchErr(r, "Səhifə yadda saxlanmadı.")); return; }
    showMsg("Yadda saxlandı. Saytda bir neçə saniyə ərzində görünəcək.");
  }

  async function load() {
    list.innerHTML = '<div class="empty">Yüklənir...</div>';
    var r = await api(PATH + "page_get&key=" + encodeURIComponent(CUR));
    if (r.status === 401) { expired(); return; }
    if (!r.ok) { showMsg(fetchErr(r, "Səhifə yüklənmədi.")); list.innerHTML = ""; return; }
    render(r.data.page || {});
  }

  AD.loadPages = load;

  document.getElementById("nav").addEventListener("click", function (e) {
    var b = e.target.closest('[data-sec="pages"]');
    if (!b) return;
    document.getElementById("secTitle").textContent = "Səhifələr";
    showMsg("");
    load();
  });
})();

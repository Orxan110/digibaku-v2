(function () {
  var AD = window.AD;
  var esc = AD.esc, api = AD.api, val = AD.val, showMsg = AD.showMsg;
  var fetchErr = AD.fetchErr, expired = AD.expired, INP = AD.INP;
  var list = AD.list;
  var LANGS = { az: "Azərbaycan", ru: "Русский", en: "English" };
  var FAQ_LANG = "az";

  // ---------- KATEQORİYALAR ----------
  function catCard(c, isNew) {
    var key = c ? c.key : "";
    return '<div class="card-box" data-cat="' + esc(key) + '" style="margin-bottom:12px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px">' +
      '<b>' + (isNew ? "Yeni kateqoriya" : esc(c.name_az)) + "</b>" +
      '<label class="muted" style="font-size:13px"><input data-f="active" type="checkbox"' +
      (!c || c.active ? " checked" : "") + "> aktiv</label></div>" +
      '<label class="muted" style="font-size:12px">Açar (latın, məs: ai_tools)</label>' +
      '<input data-f="key" value="' + esc(key) + '"' + (isNew ? "" : " readonly") +
        ' style="' + INP + ';margin-bottom:6px;' + (isNew ? "" : "opacity:.6") + '">' +
      '<label class="muted" style="font-size:12px">Ad (AZ)</label>' +
      '<input data-f="name_az" value="' + esc(c ? c.name_az : "") + '" style="' + INP + ';margin-bottom:6px">' +
      '<label class="muted" style="font-size:12px">Ad (RU)</label>' +
      '<input data-f="name_ru" value="' + esc(c ? c.name_ru || "" : "") + '" style="' + INP + ';margin-bottom:6px">' +
      '<label class="muted" style="font-size:12px">Ad (EN)</label>' +
      '<input data-f="name_en" value="' + esc(c ? c.name_en || "" : "") + '" style="' + INP + ';margin-bottom:6px">' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">' +
      '<div><label class="muted" style="font-size:12px">İkon (emoji)</label>' +
      '<input data-f="icon" value="' + esc(c ? c.icon || "" : "") + '" style="' + INP + '"></div>' +
      '<div><label class="muted" style="font-size:12px">Sıra</label>' +
      '<input data-f="sort_order" type="number" value="' + esc(c ? c.sort_order : 0) + '" style="' + INP + '"></div></div>' +
      '<button class="btn gold" data-csave="1" style="width:100%">' + (isNew ? "Əlavə et" : "Yadda saxla") + "</button>" +
      "</div>";
  }

  function renderCategories(cats) {
    var html = catCard(null, true) + cats.map(function (c) { return catCard(c, false); }).join("");
    list.innerHTML = html || '<div class="empty">Kateqoriya yoxdur.</div>';
    list.querySelectorAll("[data-csave]").forEach(function (b) {
      b.onclick = function () { saveCategory(b.closest("[data-cat]"), b); };
    });
  }

  async function saveCategory(card, btn) {
    var isNew = card.querySelector("b").textContent === "Yeni kateqoriya";
    btn.disabled = true;
    showMsg("");
    var r = await api("/api/admin?action=category_save", { method: "POST", body: {
      key: val(card, "key"),
      name_az: val(card, "name_az"),
      name_ru: val(card, "name_ru"),
      name_en: val(card, "name_en"),
      icon: val(card, "icon"),
      sort_order: val(card, "sort_order"),
      active: val(card, "active")
    } });
    btn.disabled = false;
    if (r.status === 401) { expired(); return; }
    if (!r.ok) { showMsg(fetchErr(r, "Kateqoriya yadda saxlanmadı.")); return; }
    showMsg(isNew ? "Kateqoriya əlavə olundu." : "Yadda saxlandı.");
    loadCategories();
  }

  async function loadCategories() {
    list.innerHTML = '<div class="empty">Yüklənir...</div>';
    var r = await api("/api/admin?action=categories");
    if (r.status === 401) { expired(); return; }
    if (!r.ok) { showMsg(fetchErr(r, "Kateqoriyalar yüklənmədi.")); list.innerHTML = ""; return; }
    renderCategories(r.data.categories || []);
  }

  // ---------- FAQ ----------
  function faqCard(f, isNew) {
    var lang = f ? f.language : FAQ_LANG;
    var langOpts = Object.keys(LANGS).map(function (k) {
      return '<option value="' + k + '"' + (k === lang ? " selected" : "") + ">" + LANGS[k] + "</option>";
    }).join("");
    return '<div class="card-box" data-faq="' + esc(isNew ? "" : f.id) + '" style="margin-bottom:12px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px">' +
      '<b>' + (isNew ? "Yeni sual" : "Sual") + "</b>" +
      '<label class="muted" style="font-size:13px"><input data-f="active" type="checkbox"' +
      (!f || f.active ? " checked" : "") + "> aktiv</label></div>" +
      '<label class="muted" style="font-size:12px">Dil</label>' +
      '<select data-f="language" style="' + INP + ';margin-bottom:6px">' + langOpts + "</select>" +
      '<label class="muted" style="font-size:12px">Sual</label>' +
      '<textarea data-f="question" rows="2" style="' + INP + ';margin-bottom:6px">' + esc(f ? f.question : "") + "</textarea>" +
      '<label class="muted" style="font-size:12px">Cavab</label>' +
      '<textarea data-f="answer" rows="4" style="' + INP + ';margin-bottom:6px">' + esc(f ? f.answer : "") + "</textarea>" +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">' +
      '<div><label class="muted" style="font-size:12px">Sıra</label>' +
      '<input data-f="sort_order" type="number" value="' + esc(f ? f.sort_order : 0) + '" style="' + INP + '"></div>' +
      '<div style="display:flex;align-items:flex-end;gap:8px">' +
      '<button class="btn gold" data-fsave="1" style="flex:1">' + (isNew ? "Əlavə et" : "Yadda saxla") + "</button>" +
      (isNew ? "" : '<button class="btn" data-fdel="1" style="color:#f87171">Sil</button>') +
      "</div></div></div>";
  }

  function renderFaqs(faqs) {
    var rows = faqs.filter(function (f) { return f.language === FAQ_LANG; });
    var langBar = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">' +
      Object.keys(LANGS).map(function (k) {
        return '<button class="btn' + (k === FAQ_LANG ? " gold" : "") + '" data-flang="' + k + '">' + LANGS[k] + "</button>";
      }).join("") + "</div>";
    var html = langBar + '<button class="btn gold" data-fnew="1" style="width:100%;margin-bottom:12px">+ Yeni sual</button>';
    html += rows.map(function (f) { return faqCard(f, false); }).join("");
    list.innerHTML = html || '<div class="empty">Bu dildə sual yoxdur.</div>';

    list.querySelectorAll("[data-flang]").forEach(function (b) {
      b.onclick = function () { FAQ_LANG = b.getAttribute("data-flang"); loadFaqs(); };
    });
    var newBtn = list.querySelector("[data-fnew]");
    if (newBtn) newBtn.onclick = function () {
      newBtn.insertAdjacentHTML("afterend", faqCard(null, true));
      var card = newBtn.nextElementSibling;
      card.querySelector("[data-fsave]").onclick = function () { saveFaq(card, this); };
    };
    list.querySelectorAll("[data-faq]").forEach(function (card) {
      if (!card.getAttribute("data-faq")) return;
      card.querySelector("[data-fsave]").onclick = function () { saveFaq(card, this); };
      card.querySelector("[data-fdel]").onclick = function () { deleteFaq(card); };
    });
  }

  async function saveFaq(card, btn) {
    var id = card.getAttribute("data-faq") || "";
    btn.disabled = true;
    showMsg("");
    var r = await api("/api/admin?action=faq_save", { method: "POST", body: {
      id: id,
      language: val(card, "language"),
      question: val(card, "question"),
      answer: val(card, "answer"),
      sort_order: val(card, "sort_order"),
      active: val(card, "active")
    } });
    btn.disabled = false;
    if (r.status === 401) { expired(); return; }
    if (!r.ok) { showMsg(fetchErr(r, "Sual yadda saxlanmadı.")); return; }
    showMsg("Yadda saxlandı.");
    loadFaqs();
  }

  async function deleteFaq(card) {
    if (!confirm("Bu sual silinsin?")) return;
    var r = await api("/api/admin?action=faq_delete", { method: "POST", body: { id: card.getAttribute("data-faq") } });
    if (r.status === 401) { expired(); return; }
    if (!r.ok) { showMsg(fetchErr(r, "Silinmədi.")); return; }
    showMsg("Silindi.");
    loadFaqs();
  }

  async function loadFaqs() {
    list.innerHTML = '<div class="empty">Yüklənir...</div>';
    var r = await api("/api/admin?action=faqs");
    if (r.status === 401) { expired(); return; }
    if (!r.ok) { showMsg(fetchErr(r, "FAQ yüklənmədi.")); list.innerHTML = ""; return; }
    renderFaqs(r.data.faqs || []);
  }

  AD.loadCategories = loadCategories;
  AD.loadFaqs = loadFaqs;
})();

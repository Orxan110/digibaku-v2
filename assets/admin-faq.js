(function () {
  var AD = window.AD;
  if (!AD) return;
  var esc = AD.esc, api = AD.api, val = AD.val, showMsg = AD.showMsg;
  var fetchErr = AD.fetchErr, expired = AD.expired, INP = AD.INP, list = AD.list;
  var LANGS = { az: "Azərbaycan", ru: "Русский", en: "English" };
  var PATH = "/api/admin-faq?action=";
  var FAQ_LANG = "az";
  var PRODUCTS = [];

  function prodOptions(sel) {
    var opts = '<option value="">Ümumi (səhifə FAQ-ı)</option>';
    return opts + PRODUCTS.map(function (p) {
      return '<option value="' + esc(p.product_key) + '"' + (p.product_key === sel ? " selected" : "") + ">" +
        esc(p.name_az) + "</option>";
    }).join("");
  }

  function faqCard(f, isNew) {
    var lang = f ? f.language : FAQ_LANG;
    var langOpts = Object.keys(LANGS).map(function (k) {
      return '<option value="' + k + '"' + (k === lang ? " selected" : "") + ">" + LANGS[k] + "</option>";
    }).join("");
    var title = isNew ? "Yeni sual" : (f.product_name ? esc(f.product_name) : "Ümumi");
    var showG = !f || !f.product_key || f.show_global;
    return '<div class="card-box" data-faq="' + esc(isNew ? "" : f.id) + '" style="margin-bottom:12px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px">' +
      "<b>" + title + "</b>" +
      '<label class="muted" style="font-size:13px"><input data-f="active" type="checkbox"' +
      (!f || f.active ? " checked" : "") + "> aktiv</label></div>" +
      '<label class="muted" style="font-size:12px">Məhsul</label>' +
      '<select data-f="product_key" style="' + INP + ';margin-bottom:6px">' +
      prodOptions(f ? f.product_key || "" : "") + "</select>" +
      '<label class="muted" style="font-size:13px;display:block;margin-bottom:8px">' +
      '<input data-f="show_global" type="checkbox"' + (showG ? " checked" : "") + '> Ümumi FAQ səhifəsində də göstər</label>' +
      '<label class="muted" style="font-size:12px">Dil</label>' +
      '<select data-f="language" style="' + INP + ';margin-bottom:6px">' + langOpts + "</select>" +
      '<label class="muted" style="font-size:12px">Sual</label>' +
      '<textarea data-f="question" rows="2" style="' + INP + ';margin-bottom:6px">' +
      esc(f ? f.question : "") + "</textarea>" +
      '<label class="muted" style="font-size:12px">Cavab</label>' +
      '<textarea data-f="answer" rows="4" style="' + INP + ';margin-bottom:6px">' +
      esc(f ? f.answer : "") + "</textarea>" +
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
    var r = await api(PATH + "save", { method: "POST", body: {
      id: id,
      product_key: val(card, "product_key"),
      show_global: val(card, "show_global"),
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
    var r = await api(PATH + "delete", { method: "POST", body: { id: card.getAttribute("data-faq") } });
    if (r.status === 401) { expired(); return; }
    if (!r.ok) { showMsg(fetchErr(r, "Silinmədi.")); return; }
    showMsg("Silindi.");
    loadFaqs();
  }

  async function loadFaqs() {
    list.innerHTML = '<div class="empty">Yüklənir...</div>';
    var p = await api(PATH + "products");
    if (p.status === 401) { expired(); return; }
    PRODUCTS = (p.ok && p.data.products) || [];
    var r = await api(PATH + "list");
    if (r.status === 401) { expired(); return; }
    if (!r.ok) { showMsg(fetchErr(r, "FAQ yüklənmədi.")); list.innerHTML = ""; return; }
    renderFaqs(r.data.faqs || []);
  }

  AD.loadFaqs = loadFaqs;
})();

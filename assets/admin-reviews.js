(function () {
  var AD = window.AD;
  if (!AD) return;
  var esc = AD.esc, api = AD.api, val = AD.val, showMsg = AD.showMsg;
  var fetchErr = AD.fetchErr, expired = AD.expired, INP = AD.INP, list = AD.list;
  var PATH = "/api/admin-reviews?action=";
  var STATUS_LABEL = { pending: "Gözləyir", approved: "Təsdiqləndi", rejected: "Rədd edildi" };
  var FILTER = "pending";

  function stars(n) { return "★".repeat(n) + "☆".repeat(5 - n); }

  function addForm() {
    return '<div class="card-box" data-add="1" style="margin-bottom:12px">' +
      "<b>Yeni rəy əlavə et</b>" +
      '<div style="margin-top:8px"><label class="muted" style="font-size:12px">Müştəri adı</label>' +
      '<input data-f="author_name" style="' + INP + ';margin-bottom:6px"></div>' +
      '<label class="muted" style="font-size:12px">Reytinq (1–5)</label>' +
      '<input data-f="rating" type="number" min="1" max="5" value="5" style="' + INP + ';margin-bottom:6px">' +
      '<label class="muted" style="font-size:12px">Rəy (AZ)</label>' +
      '<textarea data-f="body_az" rows="3" style="' + INP + ';margin-bottom:6px"></textarea>' +
      '<label class="muted" style="font-size:12px">Rəy (RU)</label>' +
      '<textarea data-f="body_ru" rows="2" style="' + INP + ';margin-bottom:6px"></textarea>' +
      '<label class="muted" style="font-size:12px">Rəy (EN)</label>' +
      '<textarea data-f="body_en" rows="2" style="' + INP + ';margin-bottom:6px"></textarea>' +
      '<label class="muted" style="font-size:12px">Tarix</label>' +
      '<input data-f="review_date" type="date" style="' + INP + ';margin-bottom:6px">' +
      '<label class="muted" style="font-size:13px;display:block;margin-bottom:8px">' +
      '<input data-f="show_on_home" type="checkbox"> Ana səhifədə göstər</label>' +
      '<button class="btn gold" data-addbtn="1" style="width:100%">Əlavə et (təsdiqlənmiş)</button></div>';
  }

  function reviewCard(r) {
    var text = r.body_az || r.body_ru || r.body_en || "";
    var date = r.review_date ? String(r.review_date).slice(0, 10) : "";
    var btns = "";
    if (r.status !== "approved") btns += '<button class="btn gold" data-st="approved" data-id="' + esc(r.id) + '">Təsdiqlə</button>';
    if (r.status !== "rejected") btns += '<button class="btn" data-st="rejected" data-id="' + esc(r.id) + '">Rədd et</button>';
    if (r.status === "approved") {
      btns += '<button class="btn" data-home="' + (r.show_on_home ? "0" : "1") + '" data-id="' + esc(r.id) + '">' +
        (r.show_on_home ? "Ana səhifədən çıxar" : "Ana səhifədə göstər") + "</button>";
    }
    btns += '<button class="btn" data-del="1" data-id="' + esc(r.id) + '" style="color:#f87171">Sil</button>';
    return '<div class="card-box" style="margin-bottom:10px">' +
      '<div style="display:flex;justify-content:space-between;gap:8px"><b>' + esc(r.author_name) + "</b>" +
      '<span class="muted" style="font-size:12px">' + esc(STATUS_LABEL[r.status] || r.status) + "</span></div>" +
      '<div style="color:#d4af37;margin:4px 0">' + stars(Number(r.rating) || 0) +
      ' <span class="muted" style="font-size:12px">' + esc(date) + "</span></div>" +
      '<p style="margin:6px 0;color:#d4d4d4">' + esc(text) + "</p>" +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' + btns + "</div></div>";
  }

  function render(reviews) {
    var filters = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">' +
      Object.keys(STATUS_LABEL).map(function (k) {
        return '<button class="btn' + (k === FILTER ? " gold" : "") + '" data-filter="' + k + '">' + STATUS_LABEL[k] + "</button>";
      }).join("") + "</div>";
    var rows = reviews.filter(function (r) { return r.status === FILTER; });
    list.innerHTML = addForm() + filters + (rows.map(reviewCard).join("") || '<div class="empty">Bu statusda rəy yoxdur.</div>');
    bind();
  }

  function bind() {
    list.querySelectorAll("[data-filter]").forEach(function (b) {
      b.onclick = function () { FILTER = b.getAttribute("data-filter"); loadReviews(); };
    });
    var addBtn = list.querySelector("[data-addbtn]");
    if (addBtn) addBtn.onclick = addReview;
    list.querySelectorAll("[data-st]").forEach(function (b) {
      b.onclick = function () { act("status", { id: b.getAttribute("data-id"), status: b.getAttribute("data-st") }); };
    });
    list.querySelectorAll("[data-home]").forEach(function (b) {
      b.onclick = function () { act("home", { id: b.getAttribute("data-id"), show_on_home: b.getAttribute("data-home") === "1" }); };
    });
    list.querySelectorAll("[data-del]").forEach(function (b) {
      b.onclick = function () {
        if (confirm("Bu rəy silinsin?")) act("delete", { id: b.getAttribute("data-id") });
      };
    });
  }

  async function act(name, body) {
    var r = await api(PATH + name, { method: "POST", body: body });
    if (r.status === 401) { expired(); return; }
    if (!r.ok) { showMsg(fetchErr(r, "Əməliyyat alınmadı.")); return; }
    showMsg("Yadda saxlandı.");
    loadReviews();
  }

  async function addReview() {
    var card = list.querySelector("[data-add]");
    var r = await api(PATH + "add", { method: "POST", body: {
      author_name: val(card, "author_name"),
      rating: val(card, "rating"),
      body_az: val(card, "body_az"),
      body_ru: val(card, "body_ru"),
      body_en: val(card, "body_en"),
      review_date: val(card, "review_date"),
      show_on_home: val(card, "show_on_home")
    } });
    if (r.status === 401) { expired(); return; }
    if (!r.ok) { showMsg(fetchErr(r, "Rəy əlavə olunmadı.")); return; }
    showMsg("Rəy əlavə olundu.");
    FILTER = "approved";
    loadReviews();
  }

  async function loadReviews() {
    list.innerHTML = '<div class="empty">Yüklənir...</div>';
    var r = await api(PATH + "list");
    if (r.status === 401) { expired(); return; }
    if (!r.ok) { showMsg(fetchErr(r, "Rəylər yüklənmədi.")); list.innerHTML = ""; return; }
    render(r.data.reviews || []);
  }

  AD.loadReviews = loadReviews;

  document.getElementById("nav").addEventListener("click", function (e) {
    var b = e.target.closest('[data-sec="reviews"]');
    if (!b) return;
    document.getElementById("secTitle").textContent = "Rəylər";
    showMsg("");
    loadReviews();
  });
})();

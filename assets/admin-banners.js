(function () {
  var AD = window.AD;
  if (!AD) return;
  var esc = AD.esc, api = AD.api, val = AD.val, showMsg = AD.showMsg;
  var fetchErr = AD.fetchErr, expired = AD.expired, INP = AD.INP, list = AD.list;
  var URL_PATH = "/api/admin-banners?action=";

  function field(label, f, v) {
    return '<label class="muted" style="font-size:12px">' + label + "</label>" +
      '<input data-f="' + f + '" value="' + esc(v || "") + '" style="' + INP + ';margin-bottom:6px">';
  }

  function bannerCard(b, isNew) {
    var id = isNew ? "" : b.id;
    return '<div class="card-box" data-bid="' + esc(id) + '" style="margin-bottom:12px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px">' +
      "<b>" + (isNew ? "Yeni banner" : esc(b.title_az)) + "</b>" +
      '<label class="muted" style="font-size:13px"><input data-f="active" type="checkbox"' +
      (!b || b.active ? " checked" : "") + "> aktiv</label></div>" +
      field("Başlıq (AZ)", "title_az", b && b.title_az) +
      field("Başlıq (RU)", "title_ru", b && b.title_ru) +
      field("Başlıq (EN)", "title_en", b && b.title_en) +
      field("Alt başlıq (AZ)", "subtitle_az", b && b.subtitle_az) +
      field("Alt başlıq (RU)", "subtitle_ru", b && b.subtitle_ru) +
      field("Alt başlıq (EN)", "subtitle_en", b && b.subtitle_en) +
      field("Düymə yazısı (AZ)", "cta_label_az", b && b.cta_label_az) +
      field("Düymə yazısı (RU)", "cta_label_ru", b && b.cta_label_ru) +
      field("Düymə yazısı (EN)", "cta_label_en", b && b.cta_label_en) +
      field("Düymə linki (məs: products.html)", "cta_url", b && b.cta_url) +
      field("Şəkil URL-i (istəyə bağlı)", "image_url", b && b.image_url) +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">' +
      '<div><label class="muted" style="font-size:12px">Sıra</label>' +
      '<input data-f="sort_order" type="number" value="' + esc(b ? b.sort_order : 0) + '" style="' + INP + '"></div>' +
      '<div style="display:flex;align-items:flex-end;gap:8px">' +
      '<button class="btn gold" data-bsave="1" style="flex:1">' + (isNew ? "Əlavə et" : "Yadda saxla") + "</button>" +
      (isNew ? "" : '<button class="btn" data-bdel="1" style="color:#f87171">Sil</button>') +
      "</div></div></div>";
  }

  function collect(card) {
    return {
      id: card.getAttribute("data-bid") || "",
      title_az: val(card, "title_az"), title_ru: val(card, "title_ru"), title_en: val(card, "title_en"),
      subtitle_az: val(card, "subtitle_az"), subtitle_ru: val(card, "subtitle_ru"), subtitle_en: val(card, "subtitle_en"),
      cta_label_az: val(card, "cta_label_az"), cta_label_ru: val(card, "cta_label_ru"), cta_label_en: val(card, "cta_label_en"),
      cta_url: val(card, "cta_url"), image_url: val(card, "image_url"),
      sort_order: val(card, "sort_order"), active: val(card, "active")
    };
  }

  async function saveBanner(card, btn) {
    var isNew = card.getAttribute("data-bid") === "";
    btn.disabled = true;
    showMsg("");
    var r = await api(URL_PATH + "save", { method: "POST", body: collect(card) });
    btn.disabled = false;
    if (r.status === 401) { expired(); return; }
    if (!r.ok) { showMsg(fetchErr(r, "Banner yadda saxlanmadı.")); return; }
    showMsg(isNew ? "Banner əlavə olundu." : "Yadda saxlandı.");
    loadBanners();
  }

  async function deleteBanner(card) {
    if (!confirm("Bu banner silinsin?")) return;
    var r = await api(URL_PATH + "delete", { method: "POST", body: { id: card.getAttribute("data-bid") } });
    if (r.status === 401) { expired(); return; }
    if (!r.ok) { showMsg(fetchErr(r, "Silinmədi.")); return; }
    showMsg("Silindi.");
    loadBanners();
  }

  function render(banners) {
    var html = bannerCard(null, true) + banners.map(function (b) { return bannerCard(b, false); }).join("");
    list.innerHTML = html;
    list.querySelectorAll("[data-bsave]").forEach(function (b) {
      b.onclick = function () { saveBanner(b.closest("[data-bid]"), b); };
    });
    list.querySelectorAll("[data-bdel]").forEach(function (b) {
      b.onclick = function () { deleteBanner(b.closest("[data-bid]")); };
    });
  }

  async function loadBanners() {
    list.innerHTML = '<div class="empty">Yüklənir...</div>';
    var r = await api(URL_PATH + "list");
    if (r.status === 401) { expired(); return; }
    if (!r.ok) { showMsg(fetchErr(r, "Bannerlər yüklənmədi.")); list.innerHTML = ""; return; }
    render(r.data.banners || []);
  }

  // Core nav kliklərindən sonra işə düşür: Bannerlər bölməsini açır
  document.getElementById("nav").addEventListener("click", function (e) {
    var b = e.target.closest('[data-sec="banners"]');
    if (!b) return;
    document.getElementById("secTitle").textContent = "Bannerlər";
    showMsg("");
    loadBanners();
  });
})();

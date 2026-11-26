/* DigiBaku admin əlavələri: Məhsul SEO + Təhlükəsizlik (jurnal və yoxlama) */
(function () {
  var AD = window.AD;
  if (!AD) return;
  var esc = AD.esc, api = AD.api, showMsg = AD.showMsg, fetchErr = AD.fetchErr, expired = AD.expired, INP = AD.INP, list = AD.list;
  var nav = document.getElementById("nav");
  var title = document.getElementById("secTitle");
  var PATH = "/api/admin-settings?action=";

  function addNav(sec, label) {
    if (nav.querySelector('[data-sec="' + sec + '"]')) return;
    var b = document.createElement("button");
    b.className = "ad-link";
    b.setAttribute("data-sec", sec);
    b.textContent = label;
    nav.appendChild(b);
  }
  addNav("pseo", "Məhsul SEO");
  addNav("secure", "Təhlükəsizlik");

  // ---------------- Məhsul SEO ----------------
  var PR = [], SEO = {}, CUR = "";

  function lenBadge(n, min, max) {
    var c = n === 0 ? "#f87171" : (n >= min && n <= max ? "#4ade80" : "#facc15");
    return '<span style="color:' + c + ';font-size:12px">' + n + "</span>";
  }
  function suggestTitle(p) {
    var t = p.name_az + " — qiymət Azərbaycanda | DigiBaku";
    return t.length > 65 ? p.name_az + " | DigiBaku" : t;
  }
  function suggestDesc(p) {
    var d = String(p.description_az || "").replace(/\s+/g, " ").trim();
    var s = p.name_az + " sərfəli qiymətlə. " + (d ? d + " " : "") + "Sürətli çatdırılma və WhatsApp dəstək — DigiBaku.";
    return s.slice(0, 160);
  }
  function suggestKw(p) {
    var n = p.name_az;
    return [n, n + " al", n + " qiymət", n + " Azərbaycan", n + " Bakı", n + " premium"].join(", ");
  }

  function renderList() {
    var rows = PR.map(function (p) {
      var s = SEO[p.slug] || {};
      var issues = [];
      if (!p.has_price) issues.push("qiymət yoxdur (saytda və sitemap-da görünmür)");
      if (!p.image_url) issues.push("şəkil yoxdur");
      // Yalnız SEO meta təsviri (site_settings.product_seo[slug].desc_az) yoxlanılır.
      // Məhsulun adi təsviri (description_az) ilə qarışdırılmır.
      if (!String(s.desc_az || "").trim()) issues.push("SEO təsviri yoxdur");
      if (!p.active) issues.push("passivdir");
      return '<div class="card-box" style="margin-bottom:8px;cursor:pointer" data-edit="' + esc(p.slug) + '">' +
        "<b>" + esc(p.name_az) + '</b> <span class="muted" style="font-size:12px">/product?slug=' + esc(p.slug) + "</span>" +
        '<div style="margin-top:6px;font-size:13px" class="muted">Başlıq: ' + lenBadge((s.title_az || "").length, 30, 65) +
        " · Təsvir: " + lenBadge((s.desc_az || "").length, 70, 160) +
        " · Açar söz: " + lenBadge((s.keywords_az || "").length, 10, 300) +
        (s.title_az || s.desc_az ? "" : ' · <i>avtomatik yaradılır</i>') + "</div>" +
        (issues.length ? '<div style="margin-top:4px;font-size:12px;color:#facc15">⚠ ' + esc(issues.join(", ")) + "</div>" : "") +
        "</div>";
    }).join("");
    list.innerHTML =
      '<div class="card-box" style="margin-bottom:12px"><b>Google-a düşmək üçün addımlar</b>' +
      '<ol class="muted" style="font-size:13px;padding-left:18px;margin:8px 0 0;line-height:1.6">' +
      '<li>search.google.com/search-console → saytı əlavə edin (Domain və ya URL prefix).</li>' +
      '<li>Sitemaps bölməsində <b>sitemap.xml</b> göndərin: <a href="/sitemap.xml" target="_blank" rel="noopener">sitemap.xml ↗</a> · <a href="/robots.txt" target="_blank" rel="noopener">robots.txt ↗</a></li>' +
      '<li>URL Inspection ilə ana səhifə və əsas məhsulları “İndeksləməni tələb et”.</li>' +
      '<li>Hər məhsul üçün aşağıda unikal başlıq (30–65) və təsvir (70–160) yazın. Meta “açar sözlər”i Google nəzərə almır; əsas təsir başlıq, təsvir, məhsul mətni və FAQ-dadır.</li>' +
      "</ol></div>" + (rows || '<div class="empty">Məhsul yoxdur.</div>');
    list.querySelectorAll("[data-edit]").forEach(function (el) {
      el.onclick = function () { CUR = el.getAttribute("data-edit"); renderEdit(); };
    });
  }

  function renderEdit() {
    var p = PR.filter(function (x) { return x.slug === CUR; })[0];
    if (!p) { renderList(); return; }
    var s = SEO[CUR] || {};
    list.innerHTML =
      '<button class="btn" data-back="1" style="margin-bottom:12px">← Siyahı</button>' +
      '<div class="card-box"><b>' + esc(p.name_az) + "</b>" +
      '<label class="muted" style="font-size:12px;display:block;margin-top:10px">SEO başlığı <span data-c="t"></span></label>' +
      '<input data-f="title_az" value="' + esc(s.title_az || "") + '" placeholder="' + esc(suggestTitle(p)) + '" style="' + INP + '">' +
      '<label class="muted" style="font-size:12px;display:block;margin-top:10px">Meta təsvir <span data-c="d"></span></label>' +
      '<textarea data-f="desc_az" rows="3" placeholder="' + esc(suggestDesc(p)) + '" style="' + INP + '">' + esc(s.desc_az || "") + "</textarea>" +
      '<label class="muted" style="font-size:12px;display:block;margin-top:10px">Açar sözlər (vergüllə)</label>' +
      '<input data-f="keywords_az" value="' + esc(s.keywords_az || "") + '" placeholder="' + esc(suggestKw(p)) + '" style="' + INP + '">' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">' +
      '<button class="btn" data-auto="1">✨ Avtomatik doldur</button>' +
      '<button class="btn gold" data-save="1">Yadda saxla</button></div>' +
      '<div class="muted" style="font-size:12px;margin-top:14px">Google-da görünüş:</div>' +
      '<div id="pvBox" style="background:#fff;color:#202124;border-radius:10px;padding:12px;margin-top:6px;font-family:Arial,sans-serif">' +
      '<div style="font-size:12px;color:#4d5156" id="pvUrl"></div>' +
      '<div style="font-size:18px;color:#1a0dab;margin:2px 0" id="pvT"></div>' +
      '<div style="font-size:13px;color:#4d5156" id="pvD"></div></div></div>';

    function f(n) { return list.querySelector('[data-f="' + n + '"]'); }
    function preview() {
      var t = f("title_az").value || suggestTitle(p);
      var d = f("desc_az").value || suggestDesc(p);
      list.querySelector("#pvUrl").textContent = "digibaku.com › product";
      list.querySelector("#pvT").textContent = t.slice(0, 65);
      list.querySelector("#pvD").textContent = d.slice(0, 160);
      list.querySelector('[data-c="t"]').innerHTML = lenBadge(f("title_az").value.length, 30, 65) + "/65";
      list.querySelector('[data-c="d"]').innerHTML = lenBadge(f("desc_az").value.length, 70, 160) + "/160";
    }
    ["title_az", "desc_az", "keywords_az"].forEach(function (n) { f(n).addEventListener("input", preview); });
    preview();
    list.querySelector("[data-back]").onclick = function () { renderList(); };
    list.querySelector("[data-auto]").onclick = function () {
      f("title_az").value = suggestTitle(p); f("desc_az").value = suggestDesc(p); f("keywords_az").value = suggestKw(p); preview();
    };
    list.querySelector("[data-save]").onclick = async function () {
      var body = { slug: CUR, title_az: f("title_az").value, desc_az: f("desc_az").value, keywords_az: f("keywords_az").value };
      var r = await api(PATH + "product_seo_save", { method: "POST", body: body });
      if (r.status === 401) { expired(); return; }
      if (!r.ok) { showMsg(fetchErr(r, "Yadda saxlanmadı.")); return; }
      if (!body.title_az && !body.desc_az && !body.keywords_az) delete SEO[CUR];
      else SEO[CUR] = { title_az: body.title_az, desc_az: body.desc_az, keywords_az: body.keywords_az };
      showMsg("Yadda saxlandı. Saytda 5 dəqiqə ərzində görünəcək.");
    };
  }

  async function loadSeo() {
    list.innerHTML = '<div class="empty">Yüklənir...</div>';
    var r = await api(PATH + "product_seo_get");
    if (r.status === 401) { expired(); return; }
    if (!r.ok) { showMsg(fetchErr(r, "Yüklənmədi.")); list.innerHTML = ""; return; }
    PR = r.data.products || []; SEO = r.data.seo || {};
    renderList();
  }

  // ---------------- Təhlükəsizlik ----------------
  function fmt(d) {
    var x = new Date(d);
    return isNaN(x) ? "" : x.toLocaleString("az-AZ", { dateStyle: "short", timeStyle: "medium" });
  }
  async function loadSecure() {
    list.innerHTML = '<div class="empty">Yüklənir...</div>';
    var a = await api(PATH + "security_status");
    if (a.status === 401) { expired(); return; }
    var b = await api(PATH + "audit_list");
    var checks = (a.data && a.data.checks) || [];
    var rows = (b.data && b.data.rows) || [];
    list.innerHTML =
      '<div class="card-box" style="margin-bottom:12px"><b>Təhlükəsizlik yoxlaması</b>' +
      checks.map(function (c) {
        return '<div style="margin-top:8px;font-size:14px">' + (c.ok ? "✅ " : "⚠️ ") + esc(c.label) +
          (c.ok ? "" : '<div class="muted" style="font-size:12px;margin-left:22px">' + esc(c.fix) + "</div>") + "</div>";
      }).join("") + "</div>" +
      '<div class="card-box"><b>Admin əməliyyat jurnalı (son 200)</b>' +
      (rows.length ? '<div style="overflow-x:auto;margin-top:8px"><table style="width:100%;border-collapse:collapse;font-size:12px">' +
        "<tr><th align=left>Vaxt</th><th align=left>Əməliyyat</th><th align=left>Detal</th><th align=left>IP</th></tr>" +
        rows.map(function (r) {
          return '<tr style="border-top:1px solid #262626"><td>' + esc(fmt(r.created_at)) + "</td><td>" + esc(r.action) +
            "</td><td>" + esc(r.detail || "") + "</td><td>" + esc(r.ip || "") + "</td></tr>";
        }).join("") + "</table></div>" : '<div class="muted" style="margin-top:8px">Hələ qeyd yoxdur.</div>') + "</div>";
  }

  nav.addEventListener("click", function (e) {
    var b = e.target.closest("[data-sec]");
    if (!b) return;
    var sec = b.getAttribute("data-sec");
    if (sec === "pseo") { title.textContent = "Məhsul SEO"; showMsg(""); loadSeo(); }
    else if (sec === "secure") { title.textContent = "Təhlükəsizlik"; showMsg(""); loadSecure(); }
  });
})();

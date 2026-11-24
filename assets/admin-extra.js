(function () {
  var AD = window.AD;
  if (!AD) return;
  var esc = AD.esc, api = AD.api, showMsg = AD.showMsg;
  var fetchErr = AD.fetchErr, expired = AD.expired, INP = AD.INP, list = AD.list;
  var TOKEN_KEY = "digibaku_admin";
  var LABELS = { pending: "Cavab gözləyir", confirmed: "Təsdiqləndi", processing: "Hazırlanır",
    completed: "Hazırdır", cancelled: "Ləğv edildi" };
  var COLORS = { pending: "#f59e0b", confirmed: "#38bdf8", processing: "#a78bfa",
    completed: "#4ade80", cancelled: "#f87171" };
  var STATUSES = Object.keys(LABELS);
  var NEXT = { pending: "confirmed", confirmed: "processing", processing: "completed" };
  var NEXT_LABEL = { confirmed: "✔ Təsdiqlə", processing: "⚙ Hazırlanır", completed: "✅ Hazırdır" };

  var ORDERS = [];
  var F = { status: "all", period: "all", q: "" };

  // ---------- kiçik köməkçilər ----------
  function fmt(n) { return Number(n || 0).toFixed(2); }
  function shortId(id) { return String(id).slice(0, 8); }
  function startOfToday() { var d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }

  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(t).catch(function () { return legacyCopy(t); });
    }
    return Promise.resolve(legacyCopy(t));
  }
  function legacyCopy(t) {
    var ta = document.createElement("textarea");
    ta.value = t;
    ta.style.cssText = "position:fixed;left:-9999px;top:0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta);
  }

  function itemsText(o) {
    return (o.items || []).map(function (i) { return i.name + " · " + i.months + " ay × " + i.qty; }).join("\n");
  }
  function orderSummary(o) {
    return "Sifariş #" + shortId(o.id) + "\n" +
      "Müştəri: " + (o.name ? o.name + " · " : "") + (o.email || "—") + "\n" +
      "Tarix: " + new Date(o.created_at).toLocaleString("az-AZ") + "\n" +
      "Məhsullar:\n" + (o.items || []).map(function (i) {
        return "- " + i.name + " · " + i.months + " ay × " + i.qty + " (" + fmt(i.unit_price) + " AZN)";
      }).join("\n") + "\n" +
      "Cəmi: " + fmt(o.total) + " AZN\n" +
      "Status: " + (LABELS[o.status] || o.status);
  }

  function csvCell(v) { return '"' + String(v == null ? "" : v).replace(/"/g, '""').replace(/\r?\n/g, " | ") + '"'; }
  function downloadCsv(name, rows) {
    var text = "\ufeff" + rows.map(function (r) { return r.map(csvCell).join(";"); }).join("\r\n");
    var blob = new Blob([text], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); document.body.removeChild(a); }, 500);
  }

  // ---------- SİFARİŞLƏR (təkmil) ----------
  function inPeriod(o) {
    if (F.period === "all") return true;
    var t = new Date(o.created_at).getTime();
    if (F.period === "today") return t >= startOfToday();
    var days = F.period === "7" ? 7 : 30;
    return t >= Date.now() - days * 86400000;
  }
  function matches(o) {
    if (F.status !== "all" && o.status !== F.status) return false;
    if (!inPeriod(o)) return false;
    var q = F.q.trim().toLowerCase();
    if (!q) return true;
    var hay = [o.id, o.email, o.name, o.admin_note, itemsText(o)].join(" ").toLowerCase();
    return hay.indexOf(q) !== -1;
  }

  function stat(label, value, color) {
    return '<div class="card-box" style="flex:1;min-width:120px;padding:10px 12px">' +
      '<span class="muted" style="font-size:12px">' + esc(label) + "</span>" +
      '<div style="font-size:19px;font-weight:800;color:' + (color || "#d4af37") + ';margin-top:2px">' + value + "</div></div>";
  }

  function summaryHtml() {
    var t0 = startOfToday();
    var today = ORDERS.filter(function (o) { return new Date(o.created_at).getTime() >= t0; });
    var rev = today.filter(function (o) { return o.status !== "cancelled"; })
      .reduce(function (s, o) { return s + Number(o.total); }, 0);
    var pending = ORDERS.filter(function (o) { return o.status === "pending"; }).length;
    return '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">' +
      stat("Bu gün sifariş", today.length) +
      stat("Bu gün gəlir", fmt(rev) + " AZN") +
      stat("Cavab gözləyən", pending, pending ? "#f59e0b" : "#4ade80") + "</div>";
  }

  function chipsHtml() {
    var counts = { all: ORDERS.length };
    STATUSES.forEach(function (s) { counts[s] = 0; });
    ORDERS.forEach(function (o) { if (counts[o.status] != null) counts[o.status]++; });
    var all = ["all"].concat(STATUSES);
    return all.map(function (s) {
      var on = F.status === s;
      return '<button type="button" data-chip="' + s + '" style="border:1px solid ' + (on ? "#d4af37" : "#262626") +
        ';background:' + (on ? "#d4af37" : "#111") + ';color:' + (on ? "#000" : "#f5f5f5") +
        ';border-radius:999px;padding:7px 12px;font-size:13px;cursor:pointer;font-weight:' + (on ? "700" : "400") + '">' +
        (s === "all" ? "Hamısı" : LABELS[s]) + " (" + counts[s] + ")</button>";
    }).join("");
  }

  function cardHtml(o) {
    var color = COLORS[o.status] || "#a3a3a3";
    var opts = STATUSES.map(function (s) {
      return '<option value="' + s + '"' + (s === o.status ? " selected" : "") + ">" + LABELS[s] + "</option>";
    }).join("");
    var next = NEXT[o.status]
      ? '<button type="button" class="btn gold" data-next="' + esc(o.id) + '" style="flex:1">' + NEXT_LABEL[NEXT[o.status]] + "</button>" : "";
    return '<div class="card-box" data-oid="' + esc(o.id) + '" style="margin-bottom:10px;border-left:4px solid ' + color + '">' +
      '<div style="display:flex;justify-content:space-between;gap:8px;align-items:center">' +
      "<b>#" + esc(shortId(o.id)) + '</b><span class="price">' + fmt(o.total) + " AZN</span></div>" +
      '<p style="margin:4px 0"><span style="background:' + color + ';color:#000;border-radius:6px;padding:2px 8px;font-size:12px;font-weight:700">' +
      esc(LABELS[o.status] || o.status) + "</span></p>" +
      '<p class="muted" style="font-size:13px;word-break:break-all">' + (o.name ? esc(o.name) + " · " : "") +
      esc(o.email || "—") + " · " + esc(new Date(o.created_at).toLocaleString("az-AZ")) + "</p>" +
      '<p style="margin:6px 0">' + (o.items || []).map(function (i) {
        return esc(i.name) + " · " + esc(i.months) + " ay × " + esc(i.qty);
      }).join("<br>") + "</p>" +
      '<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">' +
      '<select data-sel="' + esc(o.id) + '" style="' + INP + ';flex:1">' + opts + "</select>" +
      '<button type="button" class="btn gold" data-save="' + esc(o.id) + '">Saxla</button></div>' +
      '<div style="display:flex;gap:8px;margin-bottom:8px">' + next +
      '<button type="button" class="btn" data-copy="' + esc(o.id) + '" style="flex:1">📋 Kopyala</button></div>' +
      '<textarea data-note="' + esc(o.id) + '" rows="2" placeholder="Daxili qeyd (yalnız sizə görünür)..." style="' + INP +
      ';resize:vertical">' + esc(o.admin_note || "") + "</textarea>" +
      '<button type="button" class="btn" data-savenote="' + esc(o.id) + '" style="margin-top:6px">💾 Qeydi saxla</button>' +
      '<textarea data-dlv="' + esc(o.id) + '" rows="3" placeholder="Müştəriyə görünəcək hesab məlumatı (login / parol). «Hazırdır» olanda orders səhifəsində çıxır..." style="' + INP + ';resize:vertical;margin-top:12px">' + esc(o.delivery_info || "") + "</textarea>" +
      '<button type="button" class="btn gold" data-savedlv="' + esc(o.id) + '" style="margin-top:6px">🔑 Hesab məlumatını saxla</button></div>';
  }

  function findOrder(id) {
    for (var i = 0; i < ORDERS.length; i++) if (String(ORDERS[i].id) === String(id)) return ORDERS[i];
    return null;
  }

  async function setStatus(id, status) {
    var r = await api("/api/admin?action=order_status", { method: "POST", body: { id: id, status: status } });
    if (r.status === 401) { expired(); return false; }
    if (!r.ok) { showMsg(fetchErr(r, "Xəta baş verdi.")); return false; }
    var o = findOrder(id);
    if (o) o.status = status;
    showMsg("Yadda saxlandı: #" + shortId(id) + " → " + LABELS[status]);
    return true;
  }

  function drawOrders() {
    var box = document.getElementById("opList");
    if (!box) return;
    var rows = ORDERS.filter(matches);
    var chips = document.getElementById("opChips");
    if (chips) chips.innerHTML = chipsHtml();
    var sum = document.getElementById("opSummary");
    if (sum) sum.innerHTML = summaryHtml();
    var cnt = document.getElementById("opCount");
    if (cnt) {
      var total = rows.filter(function (o) { return o.status !== "cancelled"; })
        .reduce(function (s, o) { return s + Number(o.total); }, 0);
      cnt.textContent = "Tapıldı: " + rows.length + " sifariş · " + fmt(total) + " AZN (ləğv olunanlar xaric)";
    }
    box.innerHTML = rows.length ? rows.map(cardHtml).join("") : '<div class="empty">Sifariş tapılmadı.</div>';
  }

  function bindOrders() {
    var box = document.getElementById("opList");
    box.onclick = async function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      var id;
      if ((id = b.getAttribute("data-save"))) {
        var sel = box.querySelector('select[data-sel="' + id + '"]');
        b.disabled = true;
        if (await setStatus(id, sel.value)) drawOrders();
        b.disabled = false;
      } else if ((id = b.getAttribute("data-next"))) {
        var o = findOrder(id);
        if (!o || !NEXT[o.status]) return;
        b.disabled = true;
        if (await setStatus(id, NEXT[o.status])) drawOrders();
        else b.disabled = false;
      } else if ((id = b.getAttribute("data-copy"))) {
        var oc = findOrder(id);
        if (oc) { await copyText(orderSummary(oc)); showMsg("📋 Sifariş məlumatı kopyalandı: #" + shortId(id)); }
      } else if ((id = b.getAttribute("data-savenote"))) {
        var ta = box.querySelector('textarea[data-note="' + id + '"]');
        var r = await api("/api/admin?action=order_note", { method: "POST", body: { id: id, note: ta.value } });
        if (r.status === 401) { expired(); return; }
        if (!r.ok) { showMsg(fetchErr(r, "Qeyd saxlanmadı.")); return; }
        var on = findOrder(id);
        if (on) on.admin_note = ta.value.trim() || null;
        showMsg("💾 Qeyd saxlandı: #" + shortId(id));
      } else if ((id = b.getAttribute("data-savedlv"))) {
        var tdl = box.querySelector('textarea[data-dlv="' + id + '"]');
        var rd = await api("/api/admin?action=order_delivery", { method: "POST", body: { id: id, info: tdl.value } });
        if (rd.status === 401) { expired(); return; }
        if (!rd.ok) { showMsg(fetchErr(rd, "Saxlanmadı.")); return; }
        var od = findOrder(id);
        if (od) od.delivery_info = tdl.value.trim() || null;
        showMsg("🔑 Hesab məlumatı saxlandı: #" + shortId(id));
      }
    };
    document.getElementById("opChips").onclick = function (e) {
      var b = e.target.closest("[data-chip]");
      if (!b) return;
      F.status = b.getAttribute("data-chip");
      drawOrders();
    };
    document.getElementById("opSearch").oninput = function () { F.q = this.value; drawOrders(); };
    document.getElementById("opPeriod").onchange = function () { F.period = this.value; drawOrders(); };
    document.getElementById("opRefresh").onclick = loadOrdersPro;
    document.getElementById("opCsv").onclick = function () {
      var rows = ORDERS.filter(matches);
      if (!rows.length) { showMsg("Export üçün sifariş yoxdur."); return; }
      var out = [["ID", "Tarix", "E-poçt", "Ad", "Status", "Cəmi (AZN)", "Məhsullar", "Qeyd"]];
      rows.forEach(function (o) {
        out.push([o.id, new Date(o.created_at).toLocaleString("az-AZ"), o.email || "", o.name || "",
          LABELS[o.status] || o.status, fmt(o.total), itemsText(o), o.admin_note || ""]);
      });
      downloadCsv("sifarisler-" + new Date().toISOString().slice(0, 10) + ".csv", out);
    };
  }

  async function loadOrdersPro() {
    list.innerHTML = '<div class="empty">Yüklənir...</div>';
    var r = await api("/api/admin?action=orders2");
    if (r.status === 401) { expired(); return; }
    if (!r.ok) { showMsg(fetchErr(r, "Sifarişlər yüklənmədi.")); list.innerHTML = ""; return; }
    ORDERS = r.data.orders || [];
    var sel = function (v, t) { return '<option value="' + v + '"' + (F.period === v ? " selected" : "") + ">" + t + "</option>"; };
    list.innerHTML =
      '<div id="opSummary"></div>' +
      '<input id="opSearch" placeholder="Axtar: e-poçt, ad, məhsul, sifariş nömrəsi, qeyd..." value="' + esc(F.q) + '" style="' + INP + ';margin-bottom:8px">' +
      '<div style="display:flex;gap:8px;margin-bottom:8px">' +
      '<select id="opPeriod" style="' + INP + ';flex:1">' + sel("all", "Bütün tarixlər") + sel("today", "Bu gün") +
      sel("7", "Son 7 gün") + sel("30", "Son 30 gün") + "</select>" +
      '<button type="button" class="btn" id="opRefresh">🔄 Yenilə</button>' +
      '<button type="button" class="btn" id="opCsv">⬇ CSV</button></div>' +
      '<div id="opChips" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px"></div>' +
      '<p class="muted" id="opCount" style="font-size:13px;margin-bottom:10px"></p>' +
      '<div id="opList"></div>';
    bindOrders();
    drawOrders();
    pollNow(true);
  }
  AD.loadOrdersPro = loadOrdersPro;

  // ---------- YENİ SİFARİŞ BİLDİRİŞİ ----------
  var baseTitle = "Admin";
  var lastTotal = null;
  var badge = null;

  function ensureBadge() {
    if (badge && document.body.contains(badge)) return badge;
    var btn = document.querySelector('#nav [data-sec="orders"]');
    if (!btn) return null;
    badge = document.createElement("span");
    badge.style.cssText = "float:right;background:#ef4444;color:#fff;border-radius:999px;font-size:12px;font-weight:700;padding:1px 8px;display:none";
    btn.appendChild(badge);
    return badge;
  }

  function beep() {
    try {
      var C = window.AudioContext || window.webkitAudioContext;
      var c = new C();
      var o = c.createOscillator();
      var g = c.createGain();
      o.connect(g); g.connect(c.destination);
      o.frequency.value = 880; g.gain.value = 0.1;
      o.start();
      setTimeout(function () { o.stop(); c.close(); }, 300);
    } catch (e) {}
  }

  async function pollNow(silent) {
    var tk = "";
    try { tk = localStorage.getItem(TOKEN_KEY) || ""; } catch (e) {}
    if (!tk) return;
    var r;
    try { r = await api("/api/admin?action=new_count"); } catch (e) { return; }
    if (!r || !r.ok) return;
    var d = r.data;
    var b = ensureBadge();
    if (b) { b.textContent = d.pending; b.style.display = d.pending ? "" : "none"; }
    document.title = (d.pending ? "(" + d.pending + ") " : "") + baseTitle;
    if (lastTotal !== null && d.total > lastTotal && !silent) {
      beep();
      showMsg("🔔 Yeni sifariş gəldi! Siyahını yeniləmək üçün «Sifarişlər» düyməsinə basın.");
    }
    lastTotal = d.total;
  }
  setInterval(pollNow, 60000);
  setTimeout(pollNow, 2500);

  // ---------- ALƏTLƏR: toplu qiymət + məhsul idarəsi ----------
  var PRODS = [];
  var CATS = [];
  var pq = "";

  function prodRowsHtml() {
    var q = pq.trim().toLowerCase();
    var rows = PRODS.filter(function (p) {
      return !q || (String(p.name_az || "") + " " + p.product_key).toLowerCase().indexOf(q) !== -1;
    });
    if (!rows.length) return '<div class="empty">Məhsul tapılmadı.</div>';
    return rows.map(function (p) {
      return '<div class="card-box" style="margin-bottom:8px;padding:10px 12px">' +
        '<div style="display:flex;justify-content:space-between;gap:8px;align-items:center">' +
        '<div style="min-width:0"><b style="word-break:break-word">' + esc(p.name_az || p.product_key) + "</b>" +
        '<div class="muted" style="font-size:12px">' + esc(p.product_key) + " · " +
        (p.active ? '<span style="color:#4ade80">görünür</span>' : '<span style="color:#f87171">gizli</span>') + "</div></div></div>" +
        '<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">' +
        '<button type="button" class="btn" data-tg="' + esc(p.product_key) + '" data-to="' + (p.active ? "0" : "1") + '">' +
        (p.active ? "👁 Gizlət" : "👁 Göstər") + "</button>" +
        '<button type="button" class="btn" data-dup="' + esc(p.product_key) + '">📄 Kopyala</button>' +
        '<button type="button" class="btn" data-del="' + esc(p.product_key) + '" style="color:#f87171">🗑 Sil</button></div></div>';
    }).join("");
  }

  async function loadTools() {
    list.innerHTML = '<div class="empty">Yüklənir...</div>';
    var r = await api("/api/admin?action=products");
    if (r.status === 401) { expired(); return; }
    if (!r.ok) { showMsg(fetchErr(r, "Yüklənmədi.")); list.innerHTML = ""; return; }
    PRODS = r.data.products || [];
    CATS = r.data.categories || [];
    var catOpts = '<option value="">Bütün məhsullar</option>' + CATS.map(function (c) {
      return '<option value="' + esc(c.key) + '">' + esc(c.name_az) + "</option>";
    }).join("");
    list.innerHTML =
      '<div class="card-box" style="margin-bottom:14px"><b>💰 Toplu qiymət dəyişmə</b>' +
      '<p class="muted" style="font-size:13px;margin:6px 0 10px">Bütün müddətlərin qiymətini və endirim qiymətlərini faizlə dəyişir. ' +
      'Bahalaşma üçün <b>10</b>, ucuzlaşma üçün <b>-10</b> yazın.</p>' +
      '<select id="bkCat" style="' + INP + ';margin-bottom:8px">' + catOpts + "</select>" +
      '<input id="bkPct" type="number" step="0.1" placeholder="Faiz (məs: 10 və ya -10)" style="' + INP + ';margin-bottom:8px">' +
      '<button type="button" class="btn gold" id="bkGo" style="width:100%">Tətbiq et</button></div>' +
      '<div class="card-box" style="margin-bottom:10px"><b>📦 Məhsul idarəsi</b>' +
      '<input id="pqIn" placeholder="Məhsul axtar..." value="' + esc(pq) + '" style="' + INP + ';margin-top:8px"></div>' +
      '<div id="pqList">' + prodRowsHtml() + "</div>" +
      '<button type="button" class="btn" id="trashBtn" style="width:100%;margin-top:12px">♻️ Silinənlər</button><div id="trashBox" style="margin-top:8px"></div>';

    document.getElementById("pqIn").oninput = function () {
      pq = this.value;
      document.getElementById("pqList").innerHTML = prodRowsHtml();
    };

    document.getElementById("bkGo").onclick = async function () {
      var pct = Number(document.getElementById("bkPct").value);
      var cat = document.getElementById("bkCat").value;
      if (!pct) { showMsg("Faiz daxil edin (0 olmaz)."); return; }
      var btn = this;
      btn.disabled = true;
      var d = await api("/api/admin?action=price_bulk", { method: "POST", body: { percent: pct, category_key: cat || null, dry: true } });
      if (d.status === 401) { expired(); return; }
      if (!d.ok) { showMsg(fetchErr(d, "Xəta.")); btn.disabled = false; return; }
      var catName = cat ? (CATS.filter(function (c) { return c.key === cat; })[0] || {}).name_az : "bütün məhsullar";
      if (!d.data.count) { showMsg("Bu seçim üçün qiyməti olan məhsul yoxdur."); btn.disabled = false; return; }
      if (!confirm(d.data.count + " məhsulun (" + catName + ") bütün qiymətləri " + (pct > 0 ? "+" : "") + pct +
        "% dəyişəcək. Geri qaytarmaq üçün əks faiz lazımdır və yuvarlaqlaşdırma səbəbindən dəqiq geri dönməyə bilər. Davam edək?")) {
        btn.disabled = false; return;
      }
      var r = await api("/api/admin?action=price_bulk", { method: "POST", body: { percent: pct, category_key: cat || null } });
      btn.disabled = false;
      if (!r.ok) { showMsg(fetchErr(r, "Qiymətlər dəyişmədi.")); return; }
      showMsg("✅ " + r.data.count + " məhsulun qiyməti dəyişdi (" + (pct > 0 ? "+" : "") + pct + "%).");
      document.getElementById("bkPct").value = "";
    };

    async function loadTrash() {
      var box = document.getElementById("trashBox");
      var rt = await api("/api/admin?action=products_trash");
      if (rt.status === 401) { expired(); return; }
      if (!rt.ok) { showMsg(fetchErr(rt, "Yüklənmədi.")); return; }
      var rows = rt.data.products || [];
      box.innerHTML = rows.length ? rows.map(function (p) {
        return '<div class="card-box" style="margin-bottom:8px;padding:10px 12px"><b>' + esc(p.name_az || p.product_key) + "</b>" +
          '<div class="muted" style="font-size:12px">' + esc(p.product_key) + " · " + esc(new Date(p.deleted_at).toLocaleString("az-AZ")) + "</div>" +
          '<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">' +
          '<button type="button" class="btn gold" data-rs="' + esc(p.product_key) + '">♻️ Bərpa et</button>' +
          '<button type="button" class="btn" data-pg="' + esc(p.product_key) + '" style="color:#f87171">❌ Həmişəlik sil</button></div></div>';
      }).join("") : '<div class="empty">Silinmiş məhsul yoxdur.</div>';
    }
    document.getElementById("trashBtn").onclick = loadTrash;
    document.getElementById("trashBox").onclick = async function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      var k;
      if ((k = b.getAttribute("data-rs"))) {
        var ra = await api("/api/admin?action=product_restore", { method: "POST", body: { product_key: k } });
        if (ra.status === 401) { expired(); return; }
        if (!ra.ok) { showMsg(fetchErr(ra, "Bərpa olunmadı.")); return; }
        showMsg("♻️ Bərpa olundu (gizli rejimdə): " + k + ". «Göstər» ilə aktiv edin.");
        loadTools();
      } else if ((k = b.getAttribute("data-pg"))) {
        if (!confirm("Həmişəlik silinsin? Bunu geri qaytarmaq olmaz.")) return;
        var rb = await api("/api/admin?action=product_purge", { method: "POST", body: { product_key: k } });
        if (rb.status === 401) { expired(); return; }
        if (!rb.ok) { showMsg(fetchErr(rb, "Silinmədi.")); return; }
        showMsg("❌ Həmişəlik silindi: " + k);
        loadTrash();
      }
    };

    document.getElementById("pqList").onclick = async function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      var key;
      if ((key = b.getAttribute("data-tg"))) {
        var on = b.getAttribute("data-to") === "1";
        var r1 = await api("/api/admin?action=product_toggle", { method: "POST", body: { product_key: key, active: on } });
        if (r1.status === 401) { expired(); return; }
        if (!r1.ok) { showMsg(fetchErr(r1, "Xəta.")); return; }
        PRODS.forEach(function (p) { if (p.product_key === key) p.active = on; });
        document.getElementById("pqList").innerHTML = prodRowsHtml();
        showMsg(on ? "Məhsul göstərilir: " + key : "Məhsul gizlədildi: " + key);
      } else if ((key = b.getAttribute("data-dup"))) {
        var slug = prompt("Yeni məhsulun link adı (kiçik latın hərfi, rəqəm, tire):", key + "-2");
        if (!slug) return;
        var r2 = await api("/api/admin?action=product_duplicate", { method: "POST", body: { product_key: key, slug: slug } });
        if (r2.status === 401) { expired(); return; }
        if (!r2.ok) { showMsg(fetchErr(r2, "Kopyalanmadı.")); return; }
        showMsg("✅ Kopyalandı (gizli rejimdə): " + r2.data.product_key + ". «Məhsullar» bölməsində redaktə edib göstərin.");
        loadTools();
      } else if ((key = b.getAttribute("data-del"))) {
        var p = PRODS.filter(function (x) { return x.product_key === key; })[0] || {};
        if (!confirm("«" + (p.name_az || key) + "» silinsin? «Silinənlər» bölməsindən geri qaytara bilərsiniz.")) return;
        var r3 = await api("/api/admin?action=product_delete", { method: "POST", body: { product_key: key } });
        if (r3.status === 401) { expired(); return; }
        if (!r3.ok) { showMsg(fetchErr(r3, "Silinmədi.")); return; }
        showMsg("🗑 Silindi: " + key);
        loadTools();
      }
    };
  }

  document.getElementById("nav").addEventListener("click", function (e) {
    var b = e.target.closest('[data-sec="tools"]');
    if (!b) return;
    document.getElementById("secTitle").textContent = "Alətlər";
    showMsg("");
    loadTools();
  });
})();

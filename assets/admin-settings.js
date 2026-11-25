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

  var COLOR_DEF = "#d4af37";
  var COLOR_DEFS = { color_gold: "#d4af37", color_sale: "#d4af37", color_chat: "#3b63e0" };
  var chatIcon = "";
  function colorBlock(s) {
    var g = s.color_gold || "", sl = s.color_sale || "";
    function row(key, label, v, empty, hint) {
      return '<div style="margin-top:10px"><label class="muted" style="font-size:12px">' + esc(label) + '</label>' +
        '<div style="display:flex;gap:8px;align-items:center;margin-top:4px">' +
        '<input type="color" data-f="' + key + '" value="' + esc(v) + '"' + (empty ? ' data-empty="1"' : "") +
        ' style="width:56px;height:40px;padding:2px;border:1px solid #262626;border-radius:10px;background:#1a1a1a;cursor:pointer">' +
        '<span class="muted" style="font-size:12px;flex:1" data-hint="' + key + '">' + esc(empty ? hint : v) + "</span>" +
        '<button type="button" class="btn ghost" data-creset="' + key + '" style="padding:8px 12px;font-size:13px">Sıfırla</button>' +
        "</div></div>";
    }
    return '<div class="card-box" style="margin-bottom:12px"><b>Saytın rəngləri</b>' +
      '<p class="muted" style="font-size:12px;margin-top:4px">Seçdiyiniz rəng bütün saytda avtomatik dəyişir (düymələr, qiymətlər, vurğular, footer və s.).</p>' +
      row("color_gold", "Əsas rəng (sarı yerlər)", g || COLOR_DEF, !g, "Standart (sarı)") +
      row("color_sale", "Endirim yazısının rəngi", sl || g || COLOR_DEF, !sl, "Əsas rənglə eyni") +
      "</div>" + chatBlock(s, row);
  }
  function chatBlock(s, row) {
    chatIcon = s.chat_icon || "";
    var on = s.chat_show !== "0";
    var c = s.color_chat || "";
    return '<div class="card-box" style="margin-bottom:12px"><b>Çat düyməsi</b>' +
      '<p class="muted" style="font-size:12px;margin-top:4px">Saytın aşağı küncündəki çat düyməsi.</p>' +
      '<label style="display:flex;gap:10px;align-items:center;margin-top:10px;font-size:14px"><input type="checkbox" data-f="chat_show"' + (on ? " checked" : "") + ' style="width:20px;height:20px"> Çat düyməsi saytda göstərilsin</label>' +
      row("color_chat", "Çat düyməsinin rəngi", c || COLOR_DEFS.color_chat, !c, "Standart (mavi)") +
      '<div style="margin-top:12px"><label class="muted" style="font-size:12px">Kiçik şəkil / ikon (telefondan yüklə)</label>' +
      '<div style="display:flex;gap:10px;align-items:center;margin-top:4px;flex-wrap:wrap">' +
      '<span data-ciprev style="width:44px;height:44px;border-radius:50%;border:1px solid #262626;background:#1a1a1a center/cover no-repeat;flex:0 0 auto"></span>' +
      '<label class="btn" style="cursor:pointer">Şəkil seç<input type="file" accept="image/*" data-cifile style="display:none"></label>' +
      '<button type="button" class="btn ghost" data-cidel style="padding:8px 12px;font-size:13px">Şəkli sil</button>' +
      '<span class="muted" style="font-size:12px" data-cimsg></span></div>' +
      '<p class="muted" style="font-size:11px;margin-top:6px">Şəkil yoxdursa standart çat ikonu görünür. Şəkil çat dairəsinin tam ölçüsündə görünür (kənardakı boş yerlər avtomatik kəsilir).</p></div></div>';
  }
  function paintIconPreview() {
    var pv = list.querySelector("[data-ciprev]");
    if (pv) pv.style.backgroundImage = chatIcon ? "url(" + chatIcon + ")" : "none";
  }
  function bindChatIcon() {
    paintIconPreview();
    var f = list.querySelector("[data-cifile]"), del = list.querySelector("[data-cidel]"), msg = list.querySelector("[data-cimsg]");
    if (del) del.onclick = function () { chatIcon = ""; paintIconPreview(); msg.textContent = "Şəkil silinəcək (Yadda saxla düyməsinə bas)."; };
    if (!f) return;
    f.onchange = function () {
      var file = f.files && f.files[0];
      if (!file) return;
      if (!/^image\//.test(file.type)) { msg.textContent = "Yalnız şəkil faylı seçin."; return; }
      var rd = new FileReader();
      rd.onload = function () {
        var im = new Image();
        im.onload = function () {
          // Şəklin ətrafındakı şəffaf boş kənarları kəsir ki, ikon dairəni tam doldursun
          var sx = 0, sy = 0, sw = im.width, sh = im.height;
          try {
            var tw = Math.min(im.width, 400), tsc = tw / im.width, th = Math.max(1, Math.round(im.height * tsc));
            var tc = document.createElement("canvas");
            tc.width = tw; tc.height = th;
            var tx = tc.getContext("2d");
            tx.drawImage(im, 0, 0, tw, th);
            var d = tx.getImageData(0, 0, tw, th).data;
            var x0 = tw, y0 = th, x1 = -1, y1 = -1;
            for (var yy = 0; yy < th; yy++) {
              for (var xx = 0; xx < tw; xx++) {
                if (d[(yy * tw + xx) * 4 + 3] > 20) {
                  if (xx < x0) x0 = xx; if (xx > x1) x1 = xx;
                  if (yy < y0) y0 = yy; if (yy > y1) y1 = yy;
                }
              }
            }
            if (x1 >= x0 && y1 >= y0) {
              var bw = x1 - x0 + 1, bh = y1 - y0 + 1, side = Math.max(bw, bh);
              var cxm = x0 + bw / 2, cym = y0 + bh / 2;
              sx = Math.max(0, (cxm - side / 2) / tsc); sy = Math.max(0, (cym - side / 2) / tsc);
              sw = Math.min(im.width - sx, side / tsc); sh = Math.min(im.height - sy, side / tsc);
            }
          } catch (e) { sx = 0; sy = 0; sw = im.width; sh = im.height; }
          function make(size) {
            var cv = document.createElement("canvas");
            cv.width = size; cv.height = size;
            var cx = cv.getContext("2d");
            var sq = Math.min(sw, sh); // kvadrat kəsik: dairəni tam doldurur
            cx.drawImage(im, sx + (sw - sq) / 2, sy + (sh - sq) / 2, sq, sq, 0, 0, size, size);
            return cv.toDataURL("image/png");
          }
          var out = make(128);
          if (out.length > 85000) out = make(96);
          if (out.length > 85000) out = make(64);
          if (out.length > 85000) { msg.textContent = "Şəkil çox mürəkkəbdir, daha sadə şəkil seçin."; return; }
          chatIcon = out; paintIconPreview();
          msg.textContent = "Şəkil hazırdır (Yadda saxla düyməsinə bas).";
        };
        im.onerror = function () { msg.textContent = "Şəkil oxunmadı."; };
        im.src = rd.result;
      };
      rd.readAsDataURL(file);
      f.value = "";
    };
  }

  var FX_TYPES = [
    ["", "Yoxdur (söndürülü)"], ["snow", "❄️ Qar (Yeni il)"], ["bonfire", "🔥 Tonqal (Novruz)"],
    ["fireworks", "🎆 Fişənglər (Yeni il / bayram)"], ["confetti", "🎉 Konfeti (bayram, ad günü)"],
    ["hearts", "❤️ Ürəklər (Sevgi günü)"], ["petals", "🌸 Çiçək ləçəkləri (Yaz, 8 Mart)"]
  ];
  function fxBlock(s) {
    var t = s.fx_type || "", lv = s.fx_level || "2";
    var opts = FX_TYPES.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === t ? " selected" : "") + ">" + o[1] + "</option>"; }).join("");
    var lvs = [["1", "Az"], ["2", "Orta"], ["3", "Çox"]].map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === lv ? " selected" : "") + ">" + o[1] + "</option>"; }).join("");
    var sel = "width:100%;" + INP + ";margin-bottom:8px";
    return '<div class="card-box" style="margin-bottom:12px"><b>Bayram effekti</b>' +
      '<p class="muted" style="font-size:12px;margin-top:4px">Seçdiyiniz effekt bütün saytda görünür. Düymələrə və yazılara mane olmur.</p>' +
      '<label class="muted" style="font-size:12px">Effekt</label><select data-f="fx_type" style="' + sel + '">' + opts + "</select>" +
      '<label class="muted" style="font-size:12px">Sıxlıq</label><select data-f="fx_level" style="' + sel + '">' + lvs + "</select>" +
      '<label class="muted" style="font-size:12px">Başlama tarixi (boş qalsa dərhal başlayır)</label><input type="date" data-f="fx_from" value="' + esc(s.fx_from || "") + '" style="' + sel + '">' +
      '<label class="muted" style="font-size:12px">Bitmə tarixi (boş qalsa özü dayanmır)</label><input type="date" data-f="fx_to" value="' + esc(s.fx_to || "") + '" style="' + sel + '">' +
      '<p class="muted" style="font-size:11px">Tarix qoysanız effekt həmin günlərdə özü açılıb özü bağlanır. Məs: 25 dekabr – 5 yanvar.</p></div>';
  }

  function bindColors() {
    list.querySelectorAll('input[type="color"][data-f]').forEach(function (inp) {
      inp.addEventListener("input", function () {
        inp.removeAttribute("data-empty");
        var h = list.querySelector('[data-hint="' + inp.getAttribute("data-f") + '"]');
        if (h) h.textContent = inp.value;
      });
    });
    list.querySelectorAll("[data-creset]").forEach(function (b) {
      b.onclick = function () {
        var k = b.getAttribute("data-creset");
        var inp = list.querySelector('[data-f="' + k + '"]');
        inp.setAttribute("data-empty", "1");
        inp.value = COLOR_DEFS[k] || COLOR_DEF;
        var h = list.querySelector('[data-hint="' + k + '"]');
        if (h) h.textContent = k === "color_gold" ? "Standart (sarı)" : (k === "color_chat" ? "Standart (mavi)" : "Əsas rənglə eyni");
      };
    });
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
    html += colorBlock(s);
    html += fxBlock(s);
    html += '<button class="btn gold" data-ssave="1" style="width:100%;margin-bottom:20px">Yadda saxla</button>';
    list.innerHTML = html;
    list.querySelector("[data-ssave]").onclick = save;
    bindColors();
    bindChatIcon();
  }

  function collect() {
    var out = {};
    GROUPS.forEach(function (g) {
      g.fields.forEach(function (f) { out[f[0]] = val(list, f[0]); });
    });
    ["color_gold", "color_sale", "color_chat"].forEach(function (k) {
      var el = list.querySelector('[data-f="' + k + '"]');
      out[k] = (!el || el.getAttribute("data-empty")) ? "" : el.value;
    });
    var cs = list.querySelector('[data-f="chat_show"]');
    out.chat_show = (cs && !cs.checked) ? "0" : "1";
    out.chat_icon = chatIcon;
    ["fx_type", "fx_level", "fx_from", "fx_to"].forEach(function (k) { out[k] = val(list, k); });
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
    if (window.AdminTheme) window.AdminTheme.fromSettings({ color_gold: collect().color_gold, color_sale: collect().color_sale });
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

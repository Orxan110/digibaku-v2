(function () {
  var AD = window.AD;
  if (!AD) return;
  var esc = AD.esc, api = AD.api, showMsg = AD.showMsg;
  var fetchErr = AD.fetchErr, expired = AD.expired, INP = AD.INP, list = AD.list;
  var PATH = "/api/chat?action=";
  var FILTER = "open";
  var timer = null;
  var current = null;   // açıq söhbətin id-si
  var lastId = 0;

  function stop() { if (timer) { clearInterval(timer); timer = null; } current = null; }
  // ---------- Emoji seçimi ----------
  var EMO_CATS = [
    { i: "✨", all: true },
    { i: "😀", l: "😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 😉 😍 🥰 😘 😋 😎 🤩 🥳 🤗 🤔 😐 😴 😢 😭 😡 😱 🙄 😬 🤯 🥺 😏" },
    { i: "👍", l: "👍 👎 👌 ✌️ 🤞 🤝 👏 🙌 💪 👋 🙏 👀 🤙 ☝️ 👉 👈" },
    { i: "❤️", l: "❤️ 🧡 💛 💚 💙 💜 🖤 🤍 💔 💯 ✨ ⭐ 🔥 🎉 ✅ ❌ ⚠️ ❓ ❗ 💬" },
    { i: "🎁", l: "🎁 📎 📷 💳 💰 🛒 📦 🚀 🎧 🎬 🎮 📚 💻 📱 🔑 🔒 ⏰ 📅 📧 🌐" }
  ];
  function setupEmoji(ta) {
    var box = document.getElementById("adEmoBox"), btn = document.getElementById("adEmo");
    if (!box || !btn || !ta) return;
    var tabs = document.createElement("div");
    tabs.style.cssText = "display:flex;gap:2px;padding:4px 6px 0;border-bottom:1px solid #262626";
    var grid = document.createElement("div");
    grid.style.cssText = "display:grid;grid-template-columns:repeat(10,1fr);gap:2px;max-height:170px;overflow-y:auto;padding:8px";
    box.appendChild(tabs);
    box.appendChild(grid);
    var cur = 0;
    function paint() {
      Array.prototype.forEach.call(tabs.children, function (b, idx) {
        b.style.borderBottomColor = idx === cur ? "#d4af37" : "transparent";
        b.style.opacity = idx === cur ? "1" : ".6";
      });
      grid.innerHTML = "";
      var c = EMO_CATS[cur], list = [];
      if (c.all) EMO_CATS.forEach(function (x) { if (x.l) list = list.concat(x.l.split(" ")); });
      else list = c.l.split(" ");
      list.forEach(function (em) {
        var b = document.createElement("button");
        b.type = "button";
        b.textContent = em;
        b.style.cssText = "border:0;background:transparent;font-size:22px;line-height:1;padding:5px 0;border-radius:8px;cursor:pointer";
        b.onclick = function () {
          var st = ta.selectionStart, en = ta.selectionEnd;
          if (typeof st !== "number") { st = en = ta.value.length; }
          if (ta.value.length - (en - st) + em.length > (ta.maxLength > 0 ? ta.maxLength : 2000)) return;
          ta.setRangeText(em, st, en, "end");
          ta.dispatchEvent(new Event("input", { bubbles: true }));
          ta.focus();
        };
        grid.appendChild(b);
      });
    }
    EMO_CATS.forEach(function (c, idx) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = c.i;
      b.style.cssText = "flex:1;border:0;border-bottom:2px solid transparent;background:transparent;font-size:18px;line-height:1;padding:7px 0;cursor:pointer";
      b.onclick = function () { cur = idx; paint(); };
      tabs.appendChild(b);
    });
    btn.onclick = function () {
      var show = box.style.display === "none";
      box.style.display = show ? "block" : "none";
      if (show) { cur = 0; paint(); }
    };
  }
  // Kənara basanda emoji siyahısı bağlansın
  document.addEventListener("click", function (e) {
    var box = document.getElementById("adEmoBox");
    if (!box || box.style.display === "none") return;
    var path = e.composedPath ? e.composedPath() : [];
    if (path.indexOf(box) >= 0 || path.indexOf(document.getElementById("adEmo")) >= 0) return;
    box.style.display = "none";
  });

  function rate(v) { return Number(v) === 1 ? " 👍" : (Number(v) === -1 ? " 👎" : ""); }
  function fmt(d) {
    try { return new Date(d).toLocaleString("az-AZ"); } catch (e) { return ""; }
  }
  // Bot/operator mesajlarındakı kart və düymələr xam mətn kimi görünməsin
  function plain(s) { return window.ChatRender ? ChatRender.plain(s) : String(s || ""); }

  // Müştərinin göndərdiyi fayl: şəkil önizləmə, digərləri yükləmə linki
  function fileHtml(m) {
    var url = "/api/chat?action=file&id=" + encodeURIComponent(m.file_id);
    if (/^image\//.test(m.file_type || "")) {
      return '<a href="' + url + '" target="_blank" rel="noopener"><img src="' + url + '" alt="" style="display:block;max-width:100%;max-height:240px;border-radius:10px"></a>';
    }
    var kb = m.file_size ? " · " + Math.max(1, Math.round(m.file_size / 1024)) + " KB" : "";
    return '<a href="' + url + '" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline">📎 ' + esc(m.file_name || "fayl") + kb + "</a>";
  }

  // ---------- Söhbətlərin siyahısı ----------
  function renderList(threads) {
    var tabs = '<div style="display:flex;gap:8px;margin-bottom:12px">' +
      [["open", "Açıq"], ["closed", "Bağlı"]].map(function (x) {
        return '<button class="btn' + (x[0] === FILTER ? " gold" : "") + '" data-f="' + x[0] + '">' + x[1] + "</button>";
      }).join("") +
      '<button class="btn" id="adDelAll" style="color:#f87171;margin-left:auto">Bütün yazışmaları sil</button></div>';
    var rows = threads.filter(function (t) { return t.status === FILTER; });
    var body = rows.map(function (t) {
      var unread = Number(t.unread_admin) > 0
        ? '<span style="background:#d4af37;color:#000;border-radius:999px;padding:2px 9px;font-size:12px;font-weight:700">' + t.unread_admin + " yeni</span>" : "";
      return '<div class="card-box" data-open="' + esc(t.id) + '" style="margin-bottom:10px;cursor:pointer">' +
        '<div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b>' +
        esc(t.visitor_name || "Qonaq") + rate(t.rating) + "</b>" + unread + "</div>" +
        '<p style="margin:6px 0;color:#d4d4d4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(plain(t.last_body)) + "</p>" +
        '<span class="muted" style="font-size:12px">' + esc(fmt(t.last_message_at)) + "</span></div>";
    }).join("");
    list.innerHTML = tabs + (body || '<div class="empty">Söhbət yoxdur.</div>');
    list.querySelectorAll("[data-f]").forEach(function (b) {
      b.onclick = function () { FILTER = b.getAttribute("data-f"); loadThreads(); };
    });
    list.querySelectorAll("[data-open]").forEach(function (c) {
      c.onclick = function () { openThread(c.getAttribute("data-open")); };
    });
    var delAll = document.getElementById("adDelAll");
    if (delAll) delAll.onclick = async function () {
      if (!confirm("DİQQƏT: BÜTÜN çat yazışmaları və müştərilərin göndərdiyi fayllar həmişəlik silinəcək. Davam edilsin?")) return;
      var w = prompt("Təsdiq üçün SIL yazın:");
      if (!w || w.trim().toUpperCase() !== "SIL") return;
      var x = await api(PATH + "admin_delete_all", { method: "POST", body: { confirm: "SIL" } });
      if (x.status === 401) { expired(); return; }
      if (!x.ok) { showMsg(fetchErr(x, "Silinmədi.")); return; }
      showMsg("");
      loadThreads();
    };
  }

  async function loadThreads() {
    stop();
    list.innerHTML = '<div class="empty">Yüklənir...</div>';
    var r = await api(PATH + "admin_threads");
    if (r.status === 401) { expired(); return; }
    if (!r.ok) { showMsg(fetchErr(r, "Söhbətlər yüklənmədi.")); list.innerHTML = ""; return; }
    renderList(r.data.threads || []);
    timer = setInterval(async function () {
      var x = await api(PATH + "admin_threads");
      if (x.ok && !current) renderList(x.data.threads || []);
    }, 15000);
  }

  // ---------- Bir söhbət ----------
  function bubble(m) {
    var mine = m.sender === "admin";
    // Bot mesajı kart/düymə ilə, operatorun və müştərinin mesajı sadə mətn kimi göstərilir
    var rich = mine && m.is_bot && window.ChatRender;
    return '<div style="display:flex;flex-direction:column;align-items:' + (mine ? "flex-end" : "flex-start") + ';margin-bottom:10px">' +
      '<div style="max-width:85%;padding:10px 14px;border-radius:16px;word-break:break-word;' + (rich ? "" : "white-space:pre-wrap;") +
      (mine ? "background:#d4af37;color:#000" : "background:#1a1a1a;color:#f5f5f5;border:1px solid #262626") + '">' +
      (m.file_id ? fileHtml(m) : rich ? '<div class="cm-admin">' + ChatRender.html(m.body) + "</div>" : esc(m.body)) + "</div>" +
      '<span class="muted" style="font-size:11px;margin-top:3px">' + esc(mine ? (m.is_bot ? "Bot (avto)" : "Siz") : "Müştəri") + " · " + esc(fmt(m.created_at)) + "</span></div>";
  }

  function appendMessages(msgs) {
    var box = document.getElementById("adMsgs");
    if (!box || !msgs.length) return;
    msgs.forEach(function (m) { if (m.id > lastId) lastId = m.id; });
    box.insertAdjacentHTML("beforeend", msgs.map(bubble).join(""));
    box.scrollTop = box.scrollHeight;
  }

  async function openThread(id) {
    stop();
    current = id;
    lastId = 0;
    list.innerHTML = '<div class="empty">Yüklənir...</div>';
    var r = await api(PATH + "admin_messages&thread=" + encodeURIComponent(id));
    if (r.status === 401) { expired(); return; }
    if (!r.ok) { showMsg(fetchErr(r, "Söhbət yüklənmədi.")); current = null; loadThreads(); return; }
    var th = r.data.thread;
    var closed = th.status === "closed";
    list.innerHTML =
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">' +
      '<button class="btn" id="adBack">← Siyahı</button>' +
      '<button class="btn" id="adToggle">' + (closed ? "Yenidən aç" : "Söhbəti bağla") + "</button>" +
      '<button class="btn" id="adDel" style="color:#f87171">Sil</button></div>' +
      '<div class="card-box"><b>' + esc(th.visitor_name || "Qonaq") + rate(th.rating) + "</b>" +
      '<div id="adMsgs" style="height:44vh;min-height:240px;overflow-y:auto;margin-top:10px;padding-right:4px"></div>' +
      '<div style="position:relative;margin-top:10px">' +
      '<div id="adEmoBox" style="display:none;position:absolute;left:0;right:0;bottom:100%;margin-bottom:6px;background:#1a1a1a;border:1px solid #262626;border-radius:12px;z-index:5;overflow:hidden"></div>' +
      '<div style="display:flex;gap:8px">' +
      '<button class="btn" id="adEmo" type="button" title="Emoji" style="font-size:20px;padding:6px 12px">😊</button>' +
      '<textarea id="adText" rows="2" maxlength="2000" placeholder="Cavabınızı yazın..." style="flex:1;' + INP + ';resize:none"></textarea>' +
      '<button class="btn gold" id="adSend">Göndər</button></div></div></div>';
    appendMessages(r.data.messages || []);

    document.getElementById("adBack").onclick = function () { loadThreads(); };
    document.getElementById("adToggle").onclick = async function () {
      var x = await api(PATH + "admin_status", { method: "POST", body: { thread: id, status: closed ? "open" : "closed" } });
      if (x.status === 401) { expired(); return; }
      if (!x.ok) { showMsg(fetchErr(x, "Status dəyişmədi.")); return; }
      FILTER = closed ? "open" : "closed";
      loadThreads();
    };
    document.getElementById("adDel").onclick = async function () {
      if (!confirm("Bu söhbət tamamilə silinsin?")) return;
      var x = await api(PATH + "admin_delete", { method: "POST", body: { thread: id } });
      if (x.status === 401) { expired(); return; }
      if (!x.ok) { showMsg(fetchErr(x, "Silinmədi.")); return; }
      loadThreads();
    };
    async function sendReply() {
      var ta = document.getElementById("adText");
      var text = ta.value.trim();
      if (!text) return;
      var btn = document.getElementById("adSend");
      btn.disabled = true;
      var x = await api(PATH + "admin_reply", { method: "POST", body: { thread: id, body: text } });
      btn.disabled = false;
      if (x.status === 401) { expired(); return; }
      if (!x.ok) { showMsg(fetchErr(x, "Cavab göndərilmədi.")); return; }
      showMsg("");
      ta.value = "";
      appendMessages([x.data.message]);
    }
    document.getElementById("adSend").onclick = sendReply;
    setupEmoji(document.getElementById("adText"));
    // Operator yazarkən müştəriyə "yazır..." siqnalı (2.5 san-də bir dəfə)
    var lastTyping = 0;
    document.getElementById("adText").addEventListener("input", function () {
      var n = Date.now();
      if (n - lastTyping < 2500 || !this.value.trim()) return;
      lastTyping = n;
      api(PATH + "admin_typing", { method: "POST", body: { thread: id } });
    });

    timer = setInterval(async function () {
      if (current !== id) return;
      var x = await api(PATH + "admin_messages&thread=" + encodeURIComponent(id) + "&after=" + lastId);
      if (x.ok) appendMessages(x.data.messages || []);
    }, 5000);
  }

  AD.loadChat = loadThreads;

  document.getElementById("nav").addEventListener("click", function (e) {
    var b = e.target.closest("[data-sec]");
    if (!b) return;
    if (b.getAttribute("data-sec") === "chat") {
      document.getElementById("secTitle").textContent = "Çat";
      showMsg("");
      loadThreads();
    } else {
      stop();
    }
  });
})();

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
  function fmt(d) {
    try { return new Date(d).toLocaleString("az-AZ"); } catch (e) { return ""; }
  }

  // ---------- Söhbətlərin siyahısı ----------
  function renderList(threads) {
    var tabs = '<div style="display:flex;gap:8px;margin-bottom:12px">' +
      [["open", "Açıq"], ["closed", "Bağlı"]].map(function (x) {
        return '<button class="btn' + (x[0] === FILTER ? " gold" : "") + '" data-f="' + x[0] + '">' + x[1] + "</button>";
      }).join("") + "</div>";
    var rows = threads.filter(function (t) { return t.status === FILTER; });
    var body = rows.map(function (t) {
      var unread = Number(t.unread_admin) > 0
        ? '<span style="background:#d4af37;color:#000;border-radius:999px;padding:2px 9px;font-size:12px;font-weight:700">' + t.unread_admin + " yeni</span>" : "";
      return '<div class="card-box" data-open="' + esc(t.id) + '" style="margin-bottom:10px;cursor:pointer">' +
        '<div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b>' +
        esc(t.visitor_name || "Qonaq") + "</b>" + unread + "</div>" +
        '<p style="margin:6px 0;color:#d4d4d4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(t.last_body || "") + "</p>" +
        '<span class="muted" style="font-size:12px">' + esc(fmt(t.last_message_at)) + "</span></div>";
    }).join("");
    list.innerHTML = tabs + (body || '<div class="empty">Söhbət yoxdur.</div>');
    list.querySelectorAll("[data-f]").forEach(function (b) {
      b.onclick = function () { FILTER = b.getAttribute("data-f"); loadThreads(); };
    });
    list.querySelectorAll("[data-open]").forEach(function (c) {
      c.onclick = function () { openThread(c.getAttribute("data-open")); };
    });
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
    return '<div style="display:flex;flex-direction:column;align-items:' + (mine ? "flex-end" : "flex-start") + ';margin-bottom:10px">' +
      '<div style="max-width:85%;padding:10px 14px;border-radius:16px;white-space:pre-wrap;word-break:break-word;' +
      (mine ? "background:#d4af37;color:#000" : "background:#1a1a1a;color:#f5f5f5;border:1px solid #262626") + '">' +
      esc(m.body) + "</div>" +
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
      '<div class="card-box"><b>' + esc(th.visitor_name || "Qonaq") + "</b>" +
      '<div id="adMsgs" style="height:44vh;min-height:240px;overflow-y:auto;margin-top:10px;padding-right:4px"></div>' +
      '<div style="display:flex;gap:8px;margin-top:10px">' +
      '<textarea id="adText" rows="2" maxlength="2000" placeholder="Cavabınızı yazın..." style="flex:1;' + INP + ';resize:none"></textarea>' +
      '<button class="btn gold" id="adSend">Göndər</button></div></div>';
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

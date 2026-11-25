/* DigiBaku çat paneli — bütün səhifələrdə sağdan açılan yan panel.
   - Çat düyməsinə (və chat.html linkinə) basanda ayrıca səhifə açılmır, panel açılır
   - Panel × düyməsi və ya Esc ilə bağlanır
   - Çatın özü (mesajlar, bot, operator) köhnə chat.js ilə işləyir, ilk açılışda yüklənir */
(function () {
  if (window.__dbChatWidget) return;
  window.__dbChatWidget = true;

  var OPEN_KEY = "digibaku_chat_open";
  var lang = (window.DB && DB.lang) || "az";
  var L = { az: { close: "Bağla", chat: "Çat" }, ru: { close: "Закрыть", chat: "Чат" }, en: { close: "Close", chat: "Chat" } };
  var t = L[lang] || L.az;

  var css =
    "#dbChatPanel{position:fixed;top:0;right:0;bottom:0;width:400px;max-width:100%;z-index:90;background:var(--card);" +
      "box-shadow:-10px 0 34px rgba(0,0,0,.55);transform:translateX(105%);visibility:hidden;" +
      "transition:transform .25s ease,visibility 0s linear .25s;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}" +
    "#dbChatPanel.open{transform:none;visibility:visible;transition:transform .25s ease,visibility 0s}" +
    "#dbChatPanel .chatbox{height:100%;min-height:0;max-height:none;border:0;border-radius:0;border-left:1px solid var(--line)}" +
    "#dbChatPanel .chat-x{flex:0 0 36px;width:36px;height:36px;padding:0;border-radius:50%;border:1px solid var(--line);background:var(--card);color:var(--text);font-size:22px;cursor:pointer;line-height:1}" +
    "#dbChatPanel .chat-x:hover{border-color:var(--gold);color:var(--gold)}" +
    "#dbChatLauncher{position:fixed;right:12px;bottom:calc(84px + env(safe-area-inset-bottom));z-index:55}" +
    "@media(min-width:900px){#dbChatLauncher{bottom:24px}}" +
    "@media(max-width:899px){html.db-chat-open{overflow:hidden}}" +
    "#dbChatPanel .chat-attach{flex:0 0 44px;width:44px;height:44px;border-radius:50%;border:1px solid var(--line);background:var(--card);color:var(--text);display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0}" +
    "#dbChatPanel .chat-attach svg{width:20px;height:20px}" +
    "#dbChatPanel .chat-attach:hover{border-color:var(--gold);color:var(--gold)}" +
    "#dbChatPanel .chat-attach:disabled{opacity:.5;cursor:not-allowed}" +
    ".cm-file{display:flex;align-items:center;gap:8px;color:inherit;text-decoration:none!important}" +
    ".cm-file-t{word-break:break-all;text-decoration:underline}" +
    ".cm-file.img img{display:block;max-width:220px;max-height:220px;width:auto;height:auto;border-radius:10px}";
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  var panel = document.createElement("div");
  panel.id = "dbChatPanel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", t.chat);
  panel.setAttribute("aria-hidden", "true");
  panel.innerHTML =
    '<div class="chatbox" id="chat">' +
      '<div class="chat-head">' +
        '<div class="chat-av" aria-hidden="true">D</div>' +
        '<div class="chat-ht"><b id="chatTitle">DigiBaku</b><span id="chatSub"></span></div>' +
        '<a class="chat-wa" id="chatWa" href="#" target="_blank" rel="noopener" hidden>WhatsApp</a>' +
        '<button type="button" class="chat-new" id="chatNew">↺</button>' +
        '<button type="button" class="chat-x" id="chatClose" aria-label="' + t.close + '" title="' + t.close + '">×</button>' +
      '</div>' +
      '<div class="chat-msgs" id="chatMsgs" role="log" aria-live="polite"></div>' +
      '<div class="chat-quick" id="chatQuick"></div>' +
      '<div class="chat-foot">' +
        '<input id="chatName" class="chat-name" maxlength="60" autocomplete="name">' +
        '<div class="chat-row">' +
          '<input type="file" id="chatFile" hidden accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.txt,.docx,.xlsx,image/*">' +
          '<button id="chatAttach" class="chat-attach" type="button">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M16.5 6v11.5a4 4 0 0 1-8 0V5a2.5 2.5 0 0 1 5 0v10.5a1 1 0 0 1-2 0V6H10v9.5a2.5 2.5 0 0 0 5 0V5a4 4 0 0 0-8 0v12.5a5.5 5.5 0 0 0 11 0V6z"/></svg>' +
          '</button>' +
          '<textarea id="chatText" rows="1" maxlength="1000"></textarea>' +
          '<button id="chatSend" class="chat-send" type="button">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M3.4 20.4 21 12 3.4 3.6 3.3 10l12.6 2-12.6 2z"/></svg>' +
          '</button>' +
        '</div>' +
        '<div id="chatErr" class="err chat-err" role="alert"></div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(panel);

  // Səhifədə çat düyməsi yoxdursa (məs. #fabs olmayan səhifə) öz düyməsini əlavə edir
  function ensureLauncher() {
    if (document.querySelector(".fab.chat") || document.getElementById("dbChatLauncher")) return;
    var b = document.createElement("a");
    b.id = "dbChatLauncher";
    b.className = "fab chat";
    b.href = "chat.html";
    b.setAttribute("aria-label", t.chat);
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="#fff" d="M12 3C6.5 3 2 6.6 2 11c0 2.2 1.1 4.2 2.9 5.6L4 21l4.6-2.3c1.1.3 2.2.5 3.4.5 5.5 0 10-3.6 10-8.2S17.5 3 12 3z"/></svg>';
    document.body.appendChild(b);
  }

  var loaded = false, loading = false;
  function loadScript(src, cb) {
    var s = document.createElement("script");
    s.src = src;
    s.onload = s.onerror = cb;
    document.body.appendChild(s);
  }
  function loadChat(cb) {
    if (loaded) return cb();
    if (loading) return;
    loading = true;
    function boot() {
      loadScript("/assets/chat.js", function () { loaded = true; loading = false; cb(); });
    }
    if (window.ChatRender) boot(); else loadScript("/assets/chat-render.js", boot);
  }

  var isOpen = false;
  function open(focus) {
    if (isOpen) return;
    isOpen = true;
    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("db-chat-open");
    try { sessionStorage.setItem(OPEN_KEY, "1"); } catch (e) {}
    loadChat(function () {
      var box = document.getElementById("chatMsgs");
      if (box) box.scrollTop = box.scrollHeight;
      if (focus !== false && window.innerWidth >= 900) {
        var tx = document.getElementById("chatText");
        if (tx) tx.focus();
      }
    });
  }
  function close() {
    if (!isOpen) return;
    isOpen = false;
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("db-chat-open");
    try { sessionStorage.removeItem(OPEN_KEY); } catch (e) {}
  }

  document.getElementById("chatClose").onclick = close;
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });

  // Çat düyməsi və ya chat.html linki (bot mesajlarındakı da daxil) -> panel
  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var a = e.target.closest && e.target.closest("a.fab.chat, a[href$='chat.html'], a[href='chat']");
    if (!a) return;
    e.preventDefault();
    open();
  }, true);

  function hashCheck() {
    if (location.hash === "#chat") {
      open();
      try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
    }
  }
  window.addEventListener("hashchange", hashCheck);

  ensureLauncher();
  hashCheck();

  // Masaüstündə səhifə dəyişəndə çat açıq qalır
  try {
    if (!isOpen && sessionStorage.getItem(OPEN_KEY) === "1" && window.innerWidth >= 900) open(false);
  } catch (e) {}
})();

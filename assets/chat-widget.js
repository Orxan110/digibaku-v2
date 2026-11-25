/* DigiBaku çat paneli — bütün səhifələrdə açılan kiçik çat pəncərəsi.
   - Çat düyməsinə (və chat.html linkinə) basanda ayrıca səhifə açılmır, panel açılır
   - Panel × düyməsi və ya Esc ilə bağlanır
   - Ziyarətçi pəncərəni böyüdə/kiçildə bilər, emoji əlavə edə bilər, səsi açıb-bağlaya bilər
   - Çatın özü (mesajlar, bot, operator) köhnə chat.js ilə işləyir, ilk açılışda yüklənir */
(function () {
  if (window.__dbChatWidget) return;
  window.__dbChatWidget = true;

  var OPEN_KEY = "digibaku_chat_open";
  var lang = (window.DB && DB.lang) || "az";
  var L = {
    az: { close: "Bağla", chat: "Çat", mute: "Səsi bağla", unmute: "Səsi aç", big: "Böyüt", small: "Kiçilt", emoji: "Emoji" },
    ru: { close: "Закрыть", chat: "Чат", mute: "Выключить звук", unmute: "Включить звук", big: "Развернуть", small: "Свернуть", emoji: "Эмодзи" },
    en: { close: "Close", chat: "Chat", mute: "Mute sound", unmute: "Turn sound on", big: "Enlarge", small: "Shrink", emoji: "Emoji" }
  };
  var t = L[lang] || L.az;

  var css =
    "#dbChatPanel{position:fixed;left:0;right:0;bottom:0;top:auto;width:100%;height:72vh;height:72dvh;z-index:90;background:var(--card);overflow:hidden;" +
      "border:1px solid var(--line);border-bottom:0;border-radius:18px 18px 0 0;box-shadow:0 -8px 34px rgba(0,0,0,.55);" +
      "visibility:hidden;opacity:0;transform:translateY(16px);padding-bottom:env(safe-area-inset-bottom);" +
      "transition:transform .22s ease,opacity .22s ease,visibility 0s linear .22s,width .2s ease,height .2s ease}" +
    "#dbChatPanel.open{visibility:visible;opacity:1;transform:none;transition:transform .22s ease,opacity .22s ease,visibility 0s,width .2s ease,height .2s ease}" +
    "#dbChatPanel.big{height:100vh;height:100dvh;border-radius:0;border:0;padding-top:env(safe-area-inset-top)}" +
    "@media(min-width:900px){" +
      "#dbChatPanel{left:auto;right:20px;bottom:20px;width:370px;height:540px;height:min(540px,calc(100dvh - 40px));border-radius:18px;border-bottom:1px solid var(--line);padding-bottom:0;box-shadow:0 14px 44px rgba(0,0,0,.6)}" +
      "#dbChatPanel.big{width:520px;width:min(520px,calc(100vw - 40px));height:calc(100vh - 40px);height:calc(100dvh - 40px);border-radius:18px;border:1px solid var(--line);padding-top:0}" +
    "}" +
    "#dbChatPanel .chatbox{height:100%;min-height:0;max-height:none;border:0;border-radius:0}" +
    "#dbChatPanel .chat-x{flex:0 0 36px;width:36px;height:36px;padding:0;border-radius:50%;border:1px solid var(--line);background:var(--card);color:var(--text);font-size:22px;cursor:pointer;line-height:1}" +
    "#dbChatPanel .chat-x:hover{border-color:var(--gold);color:var(--gold)}" +
    "#dbChatPanel .chat-head{gap:6px}" +
    "#dbChatPanel .chat-new,#dbChatPanel .chat-snd,#dbChatPanel .chat-size,#dbChatPanel .chat-x{flex:0 0 32px;width:32px;height:32px;padding:0;border-radius:50%;border:1px solid var(--line);background:var(--card);color:var(--text);cursor:pointer;line-height:1;display:flex;align-items:center;justify-content:center}" +
    "#dbChatPanel .chat-new{font-size:16px}#dbChatPanel .chat-snd{font-size:14px}#dbChatPanel .chat-x{font-size:20px}" +
    "#dbChatPanel .chat-snd.off{opacity:.55}" +
    "#dbChatPanel .chat-size svg{width:15px;height:15px}" +
    "#dbChatPanel .chat-new:hover,#dbChatPanel .chat-snd:hover,#dbChatPanel .chat-size:hover{border-color:var(--gold);color:var(--gold)}" +
    "#dbChatPanel .chat-wa{padding:6px 10px;font-size:12px}" +
    "@media(max-width:420px){#dbChatPanel .chat-av{display:none}}" +
    "#dbChatPanel .chat-foot{position:relative}" +
    "#dbChatPanel .chat-attach{font-size:20px;line-height:1}" +
    "#dbChatPanel .chat-emoji{display:none;position:absolute;left:8px;right:8px;bottom:calc(100% + 6px);z-index:5;grid-template-columns:repeat(8,1fr);gap:2px;max-height:184px;overflow-y:auto;padding:8px;background:var(--card2);border:1px solid var(--line);border-radius:14px;box-shadow:0 8px 24px rgba(0,0,0,.5);-webkit-overflow-scrolling:touch;overscroll-behavior:contain}" +
    "#dbChatPanel .chat-emoji.show{display:grid}" +
    "#dbChatPanel .chat-emoji button{border:0;background:transparent;font-size:22px;line-height:1;padding:5px 0;border-radius:8px;cursor:pointer}" +
    "#dbChatPanel .chat-emoji button:hover{background:var(--card)}" +
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
        '<button type="button" class="chat-snd" id="chatSnd"></button>' +
        '<button type="button" class="chat-size" id="chatSize"></button>' +
        '<button type="button" class="chat-x" id="chatClose" aria-label="' + t.close + '" title="' + t.close + '">×</button>' +
      '</div>' +
      '<div class="chat-msgs" id="chatMsgs" role="log" aria-live="polite"></div>' +
      '<div class="chat-quick" id="chatQuick"></div>' +
      '<div class="chat-foot">' +
        '<div class="chat-emoji" id="chatEmoji"></div>' +
        '<input id="chatName" class="chat-name" maxlength="60" autocomplete="name">' +
        '<div class="chat-row">' +
          '<input type="file" id="chatFile" hidden accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.txt,.docx,.xlsx,image/*">' +
          '<button id="chatAttach" class="chat-attach" type="button">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M16.5 6v11.5a4 4 0 0 1-8 0V5a2.5 2.5 0 0 1 5 0v10.5a1 1 0 0 1-2 0V6H10v9.5a2.5 2.5 0 0 0 5 0V5a4 4 0 0 0-8 0v12.5a5.5 5.5 0 0 0 11 0V6z"/></svg>' +
          '</button>' +
          '<button id="chatEmoBtn" class="chat-attach" type="button" aria-expanded="false">😊</button>' +
          '<textarea id="chatText" rows="1" maxlength="1000"></textarea>' +
          '<button id="chatSend" class="chat-send" type="button">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M3.4 20.4 21 12 3.4 3.6 3.3 10l12.6 2-12.6 2z"/></svg>' +
          '</button>' +
        '</div>' +
        '<div id="chatErr" class="err chat-err" role="alert"></div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(panel);

  // ---------- Səs (bildiriş) ----------
  var SOUND_KEY = "digibaku_chat_sound";
  var actx = null;
  function soundOn() { try { return localStorage.getItem(SOUND_KEY) !== "0"; } catch (e) { return true; } }
  function unlock() {
    try {
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      if (!actx) actx = new C();
      if (actx.state === "suspended") actx.resume();
    } catch (e) {}
  }
  function playSound(force) {
    if (!force && !soundOn()) return;
    try {
      unlock();
      if (!actx) return;
      var now = actx.currentTime;
      [[880, 0], [1175, 0.13]].forEach(function (n) {
        var o = actx.createOscillator(), g = actx.createGain();
        o.type = "sine";
        o.frequency.value = n[0];
        g.gain.setValueAtTime(0.0001, now + n[1]);
        g.gain.exponentialRampToValueAtTime(0.18, now + n[1] + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + n[1] + 0.28);
        o.connect(g); g.connect(actx.destination);
        o.start(now + n[1]); o.stop(now + n[1] + 0.3);
      });
    } catch (e) {}
  }
  window.__dbChatSound = { play: function () { playSound(false); }, unlock: unlock, on: soundOn };
  panel.addEventListener("pointerdown", unlock, { passive: true });
  panel.addEventListener("keydown", unlock);

  var sndBtn = document.getElementById("chatSnd");
  function applySound() {
    var on = soundOn();
    sndBtn.textContent = on ? "🔊" : "🔇";
    sndBtn.classList.toggle("off", !on);
    sndBtn.title = on ? t.mute : t.unmute;
    sndBtn.setAttribute("aria-label", sndBtn.title);
    sndBtn.setAttribute("aria-pressed", on ? "true" : "false");
  }
  sndBtn.onclick = function () {
    var turnOn = !soundOn();
    try { localStorage.setItem(SOUND_KEY, turnOn ? "1" : "0"); } catch (e) {}
    applySound();
    if (turnOn) playSound(true);
  };
  applySound();

  // ---------- Pəncərə ölçüsü (kiçik / böyük) ----------
  var SIZE_KEY = "digibaku_chat_big";
  var ICON_BIG = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
  var ICON_SMALL = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>';
  var sizeBtn = document.getElementById("chatSize");
  var big = false;
  try { big = sessionStorage.getItem(SIZE_KEY) === "1"; } catch (e) {}
  function applySize(scroll) {
    panel.classList.toggle("big", big);
    sizeBtn.innerHTML = big ? ICON_SMALL : ICON_BIG;
    sizeBtn.title = big ? t.small : t.big;
    sizeBtn.setAttribute("aria-label", sizeBtn.title);
    if (scroll) setTimeout(function () {
      var m = document.getElementById("chatMsgs");
      if (m) m.scrollTop = m.scrollHeight;
    }, 230);
  }
  sizeBtn.onclick = function () {
    big = !big;
    try { sessionStorage.setItem(SIZE_KEY, big ? "1" : "0"); } catch (e) {}
    applySize(true);
  };
  applySize(false);

  // ---------- Emoji ----------
  var EMOJIS = ("😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 😉 😍 🥰 😘 😋 😎 🤩 🥳 🤗 🤔 😐 😴 😢 😭 😡 😱 🙏 👍 👎 👌 ✌️ 🤞 🤝 👏 🙌 💪 👋 " +
    "🔥 ✨ ⭐ 🎉 🎁 💯 ❤️ 🧡 💛 💚 💙 💜 🖤 💔 ✅ ❌ ⚠️ ❓ ❗ 💬 📎 📷 💳 💰 🛒 📦 🚀 🎧 🎬 🎮 📚 💻 📱 🔑 🔒 ⏰ 📅").split(" ");
  var emoBox = document.getElementById("chatEmoji");
  var emoBtn = document.getElementById("chatEmoBtn");
  emoBtn.title = t.emoji;
  emoBtn.setAttribute("aria-label", t.emoji);
  EMOJIS.forEach(function (em) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = em;
    b.onclick = function () {
      var tx = document.getElementById("chatText");
      if (!tx) return;
      var s = tx.selectionStart, e2 = tx.selectionEnd;
      if (typeof s !== "number") { s = e2 = tx.value.length; }
      if (tx.value.length - (e2 - s) + em.length > (tx.maxLength > 0 ? tx.maxLength : 1000)) return;
      tx.setRangeText(em, s, e2, "end");
      tx.dispatchEvent(new Event("input", { bubbles: true }));
      if (window.innerWidth >= 900) tx.focus();
    };
    emoBox.appendChild(b);
  });
  function emoOpen() { return emoBox.classList.contains("show"); }
  function hideEmo() {
    emoBox.classList.remove("show");
    emoBtn.setAttribute("aria-expanded", "false");
  }
  emoBtn.onclick = function () {
    var show = !emoOpen();
    emoBox.classList.toggle("show", show);
    emoBtn.setAttribute("aria-expanded", show ? "true" : "false");
  };
  document.addEventListener("click", function (e) {
    if (emoOpen() && !(e.target.closest && e.target.closest("#chatEmoji,#chatEmoBtn"))) hideEmo();
  });

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
    unlock();
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
    hideEmo();
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("db-chat-open");
    try { sessionStorage.removeItem(OPEN_KEY); } catch (e) {}
  }

  document.getElementById("chatClose").onclick = close;
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (emoOpen()) { hideEmo(); return; }
    close();
  });

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

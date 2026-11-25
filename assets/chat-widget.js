/* DigiBaku çat paneli — bütün səhifələrdə açılan kiçik çat pəncərəsi.
   - Çat düyməsinə (və chat.html linkinə) basanda ayrıca səhifə açılmır, panel açılır
   - Panel × düyməsi və ya Esc ilə bağlanır
   - Ziyarətçi pəncərəni böyüdə/kiçildə, emoji əlavə edə, səsi (və tonunu) seçə bilər
   - Oxunmamış mesaj sayı çat düyməsində və səhifə başlığında göstərilir
   - Məhsul səhifəsində 25 saniyədən sonra "Kömək lazımdır?" balonu çıxır
   - İş saatları sayt parametrlərindən (hours_az) götürülür; operator oflayndırsa xəbərdarlıq göstərilir
   - Çatın özü (mesajlar, bot, operator) chat.js ilə işləyir, ilk açılışda yüklənir */
(function () {
  if (window.__dbChatWidget) return;
  window.__dbChatWidget = true;

  var OPEN_KEY = "digibaku_chat_open", TOKEN_KEY = "digibaku_chat", SEEN_KEY = "digibaku_chat_seen",
      SOUND_KEY = "digibaku_chat_sound", TONE_KEY = "digibaku_chat_tone", SIZE_KEY = "digibaku_chat_big",
      RECENT_KEY = "digibaku_chat_recent", GREET_KEY = "digibaku_chat_greet";
  var lang = (window.DB && DB.lang) || "az";
  var L = {
    az: { close: "Bağla", chat: "Çat", mute: "Səsi bağla", unmute: "Səsi aç", big: "Böyüt", small: "Kiçilt", emoji: "Emoji",
          sound: "Bildiriş səsi", tones: { ding: "Ding", pop: "Pop", bell: "Zəng", chime: "Melodiya" },
          newMsg: "Yeni mesaj", greet: "Kömək lazımdır? 👋", wa: "WhatsApp",
          offline: "Operator hazırda oflayndır (iş saatları: {h}). Bot cavab verəcək, təcili üçün WhatsApp-a yazın." },
    ru: { close: "Закрыть", chat: "Чат", mute: "Выключить звук", unmute: "Включить звук", big: "Развернуть", small: "Свернуть", emoji: "Эмодзи",
          sound: "Звук уведомления", tones: { ding: "Динь", pop: "Поп", bell: "Колокол", chime: "Мелодия" },
          newMsg: "Новое сообщение", greet: "Нужна помощь? 👋", wa: "WhatsApp",
          offline: "Оператор сейчас не в сети (часы работы: {h}). Ответит бот, по срочным вопросам пишите в WhatsApp." },
    en: { close: "Close", chat: "Chat", mute: "Mute sound", unmute: "Turn sound on", big: "Enlarge", small: "Shrink", emoji: "Emoji",
          sound: "Notification sound", tones: { ding: "Ding", pop: "Pop", bell: "Bell", chime: "Chime" },
          newMsg: "New message", greet: "Need help? 👋", wa: "WhatsApp",
          offline: "Operator is offline right now (hours: {h}). The bot will reply; for urgent matters message us on WhatsApp." }
  };
  var t = L[lang] || L.az;

  var css = [
    "#dbChatPanel{position:fixed;left:0;right:0;bottom:0;top:auto;width:100%;height:72vh;height:72dvh;z-index:90;background:var(--card);overflow:hidden;",
      "border:1px solid var(--line);border-bottom:0;border-radius:18px 18px 0 0;box-shadow:0 -8px 34px rgba(0,0,0,.55);",
      "visibility:hidden;opacity:0;transform:translateY(16px);padding-bottom:env(safe-area-inset-bottom);",
      "transition:transform .22s ease,opacity .22s ease,visibility 0s linear .22s,width .2s ease,height .2s ease}",
    "#dbChatPanel.open{visibility:visible;opacity:1;transform:none;transition:transform .22s ease,opacity .22s ease,visibility 0s,width .2s ease,height .2s ease}",
    "#dbChatPanel.big{height:100vh;height:100dvh;border-radius:0;border:0;padding-top:env(safe-area-inset-top)}",
    "@media(min-width:900px){",
      "#dbChatPanel{left:auto;right:20px;bottom:20px;width:370px;height:540px;height:min(540px,calc(100dvh - 40px));border-radius:18px;border-bottom:1px solid var(--line);padding-bottom:0;box-shadow:0 14px 44px rgba(0,0,0,.6)}",
      "#dbChatPanel.big{width:520px;width:min(520px,calc(100vw - 40px));height:calc(100vh - 40px);height:calc(100dvh - 40px);border-radius:18px;border:1px solid var(--line);padding-top:0}",
    "}",
    "#dbChatPanel .chatbox{height:100%;min-height:0;max-height:none;border:0;border-radius:0}",
    "#dbChatPanel .chat-x:hover{border-color:var(--gold);color:var(--gold)}",
    "#dbChatPanel .chat-head{gap:6px}",
    "#dbChatPanel .chat-new,#dbChatPanel .chat-snd,#dbChatPanel .chat-size,#dbChatPanel .chat-x{flex:0 0 32px;width:32px;height:32px;padding:0;border-radius:50%;border:1px solid var(--line);background:var(--card);color:var(--text);cursor:pointer;line-height:1;display:flex;align-items:center;justify-content:center}",
    "#dbChatPanel .chat-new{font-size:16px}#dbChatPanel .chat-snd{font-size:14px}#dbChatPanel .chat-x{font-size:20px}",
    "#dbChatPanel .chat-snd.off{opacity:.55}",
    "#dbChatPanel .chat-size svg{width:15px;height:15px}",
    "#dbChatPanel .chat-new:hover,#dbChatPanel .chat-snd:hover,#dbChatPanel .chat-size:hover{border-color:var(--gold);color:var(--gold)}",
    "#dbChatPanel .chat-wa{padding:6px 10px;font-size:12px}",
    "@keyframes dbPulse{0%,100%{box-shadow:0 0 0 0 rgba(37,211,102,.6)}50%{box-shadow:0 0 0 7px rgba(37,211,102,0)}}",
    "#dbChatPanel.offline .chat-wa{animation:dbPulse 1.6s infinite}",
    "@media(max-width:420px){#dbChatPanel .chat-av{display:none}}",
    /* iş saatları xəbərdarlığı */
    "#dbChatPanel .chat-hours{padding:8px 14px;font-size:12.5px;line-height:1.4;background:rgba(212,175,55,.12);border-bottom:1px solid var(--line);color:var(--text)}",
    "#dbChatPanel .chat-hours[hidden]{display:none}",
    "#dbChatPanel .chat-hours a{display:inline-block;margin-left:6px;background:#25d366;color:#04200e;font-weight:700;border-radius:999px;padding:3px 10px;text-decoration:none}",
    /* səs menyusu */
    "#dbChatPanel .chat-snd-menu{position:absolute;top:58px;right:10px;z-index:6;min-width:190px;display:flex;flex-direction:column;gap:4px;padding:8px;background:var(--card2);border:1px solid var(--line);border-radius:14px;box-shadow:0 8px 24px rgba(0,0,0,.5)}",
    "#dbChatPanel .chat-snd-menu[hidden]{display:none}",
    "#dbChatPanel .chat-snd-menu button{display:flex;align-items:center;gap:8px;width:100%;text-align:left;border:0;background:transparent;color:var(--text);font:inherit;font-size:14px;padding:8px 10px;border-radius:9px;cursor:pointer}",
    "#dbChatPanel .chat-snd-menu button:hover{background:var(--card)}",
    "#dbChatPanel .chat-snd-menu .snd-toggle{font-weight:700;border-bottom:1px solid var(--line);border-radius:9px 9px 0 0}",
    "#dbChatPanel .chat-snd-menu .snd-title{font-size:11px;color:var(--muted);padding:4px 10px 0;text-transform:uppercase;letter-spacing:.4px}",
    "#dbChatPanel .chat-snd-menu .snd-tone.on{color:var(--gold)}",
    "#dbChatPanel .chat-snd-menu .snd-tone.on::after{content:\"✓\";margin-left:auto}",
    /* emoji */
    "#dbChatPanel .chat-foot{position:relative}",
    "#dbChatPanel .chat-attach{font-size:20px;line-height:1}",
    "#dbChatPanel .chat-emoji{display:none;position:absolute;left:8px;right:8px;bottom:calc(100% + 6px);z-index:5;flex-direction:column;background:var(--card2);border:1px solid var(--line);border-radius:14px;box-shadow:0 8px 24px rgba(0,0,0,.5);overflow:hidden}",
    "#dbChatPanel .chat-emoji.show{display:flex}",
    "#dbChatPanel .emo-tabs{display:flex;gap:2px;padding:4px 6px 0;border-bottom:1px solid var(--line)}",
    "#dbChatPanel .emo-tabs button{flex:1;border:0;border-bottom:2px solid transparent;background:transparent;font-size:18px;line-height:1;padding:7px 0;cursor:pointer;opacity:.6}",
    "#dbChatPanel .emo-tabs button.on{opacity:1;border-bottom-color:var(--gold)}",
    "#dbChatPanel .emo-grid{display:grid;grid-template-columns:repeat(8,1fr);gap:2px;max-height:150px;min-height:56px;overflow-y:auto;padding:8px;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}",
    "#dbChatPanel .emo-grid button{border:0;background:transparent;font-size:22px;line-height:1;padding:5px 0;border-radius:8px;cursor:pointer}",
    "#dbChatPanel .emo-grid button:hover{background:var(--card)}",
    "#dbChatPanel .emo-empty{grid-column:1/-1;text-align:center;color:var(--muted);font-size:13px;padding:10px 0}",
    /* fayl sürüşdürmə */
    "#dbChatPanel.drag::after{content:\"📎\";position:absolute;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;font-size:56px;background:rgba(0,0,0,.65);border:2px dashed var(--gold);border-radius:inherit;pointer-events:none}",
    /* qiymətləndirmə kartı */
    ".cm-rate{align-self:center;display:flex;flex-direction:column;align-items:center;gap:8px;margin:10px 0;padding:12px 16px;border:1px solid var(--line);border-radius:14px;background:var(--card2);font-size:14px;text-align:center}",
    ".cm-rate div{display:flex;gap:8px}",
    ".cm-rate button{border:1px solid var(--line);background:var(--card);color:var(--text);border-radius:999px;padding:8px 14px;font:inherit;font-size:14px;cursor:pointer}",
    ".cm-rate button:hover{border-color:var(--gold);color:var(--gold)}",
    /* düymə, nişan, balon */
    "#dbChatLauncher{position:fixed;right:12px;bottom:calc(84px + env(safe-area-inset-bottom));z-index:55}",
    "@media(min-width:900px){#dbChatLauncher{bottom:24px}}",
    "@media(max-width:899px){html.db-chat-open{overflow:hidden}}",
    "a.fab.chat{position:relative}",
    ".db-badge{position:absolute;top:-4px;right:-4px;min-width:20px;height:20px;padding:0 5px;box-sizing:border-box;border-radius:10px;background:#ef4444;color:#fff;font-size:12px;font-weight:700;line-height:20px;text-align:center;border:2px solid #000;pointer-events:none}",
    "@keyframes dbFade{from{opacity:0;transform:translateY(-50%) translateX(8px)}to{opacity:1;transform:translateY(-50%)}}",
    "#dbChatGreet{position:fixed;z-index:56;transform:translateY(-50%);max-width:220px;padding:10px 32px 10px 14px;background:var(--card2);color:var(--text);border:1px solid var(--gold);border-radius:14px;font-size:14px;line-height:1.35;box-shadow:0 6px 22px rgba(0,0,0,.5);cursor:pointer;animation:dbFade .3s ease}",
    "#dbChatGreet .g-x{position:absolute;top:4px;right:6px;width:22px;height:22px;border:0;background:transparent;color:var(--muted);font-size:18px;line-height:1;cursor:pointer;padding:0}",
    "#dbChatPanel .chat-attach{flex:0 0 44px;width:44px;height:44px;border-radius:50%;border:1px solid var(--line);background:var(--card);color:var(--text);display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0}",
    "#dbChatPanel .chat-attach svg{width:20px;height:20px}",
    "#dbChatPanel .chat-attach:hover{border-color:var(--gold);color:var(--gold)}",
    "#dbChatPanel .chat-attach:disabled{opacity:.5;cursor:not-allowed}",
    ".cm-file{display:flex;align-items:center;gap:8px;color:inherit;text-decoration:none!important}",
    ".cm-file-t{word-break:break-all;text-decoration:underline}",
    ".cm-file.img img{display:block;max-width:220px;max-height:220px;width:auto;height:auto;border-radius:10px}"
  ].join("");
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
      '<div class="chat-hours" id="chatHours" hidden><span id="chatHoursTx"></span><a id="chatHoursWa" href="#" target="_blank" rel="noopener">' + t.wa + '</a></div>' +
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
    '</div>' +
    '<div class="chat-snd-menu" id="chatSndMenu" hidden></div>';
  document.body.appendChild(panel);

  // ---------- Yadda saxlanan qiymətlər ----------
  function getToken() { try { return localStorage.getItem(TOKEN_KEY) || ""; } catch (e) { return ""; } }
  function getSeen() {
    try { var v = localStorage.getItem(SEEN_KEY); return v === null ? null : (parseInt(v, 10) || 0); } catch (e) { return 0; }
  }
  function setSeen(n) {
    try { var cur = getSeen(); if (cur === null || n > cur) localStorage.setItem(SEEN_KEY, String(n)); } catch (e) {}
  }

  // ---------- Səs (bildiriş) ----------
  // hər not: [tezlik, başlanğıc(san), müddət(san), dalğa, səs gücü]
  var TONES = {
    ding:  [[880, 0, 0.28, "sine", 0.18], [1175, 0.13, 0.28, "sine", 0.18]],
    pop:   [[700, 0, 0.14, "triangle", 0.25], [520, 0.06, 0.12, "triangle", 0.18]],
    bell:  [[1318, 0, 0.7, "sine", 0.16], [1976, 0, 0.45, "sine", 0.08], [659, 0, 0.7, "sine", 0.07]],
    chime: [[784, 0, 0.25, "sine", 0.16], [988, 0.12, 0.25, "sine", 0.16], [1175, 0.24, 0.4, "sine", 0.16]]
  };
  var TONE_ORDER = ["ding", "pop", "bell", "chime"];
  var actx = null;
  function soundOn() { try { return localStorage.getItem(SOUND_KEY) !== "0"; } catch (e) { return true; } }
  function getTone() { try { var v = localStorage.getItem(TONE_KEY); return TONES[v] ? v : "ding"; } catch (e) { return "ding"; } }
  function unlock() {
    try {
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      if (!actx) actx = new C();
      if (actx.state === "suspended") actx.resume();
    } catch (e) {}
  }
  function playSound(force, tone) {
    if (!force && !soundOn()) return;
    try {
      unlock();
      if (!actx) return;
      var now = actx.currentTime;
      TONES[tone || getTone()].forEach(function (n) {
        var o = actx.createOscillator(), g = actx.createGain();
        o.type = n[3];
        o.frequency.value = n[0];
        g.gain.setValueAtTime(0.0001, now + n[1]);
        g.gain.exponentialRampToValueAtTime(n[4], now + n[1] + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + n[1] + n[2]);
        o.connect(g); g.connect(actx.destination);
        o.start(now + n[1]); o.stop(now + n[1] + n[2] + 0.05);
      });
    } catch (e) {}
  }
  window.__dbChatSound = { play: function () { playSound(false); }, unlock: unlock, on: soundOn };
  panel.addEventListener("pointerdown", unlock, { passive: true });
  panel.addEventListener("keydown", unlock);
  // Səhifədə ilk toxunuşdan sonra səs icazəsi açılır (çat bağlı olanda da bildiriş çalsın deyə)
  document.addEventListener("pointerdown", unlock, { once: true, passive: true });
  document.addEventListener("keydown", unlock, { once: true });

  var sndBtn = document.getElementById("chatSnd");
  var sndMenu = document.getElementById("chatSndMenu");
  function applySound() {
    var on = soundOn();
    sndBtn.textContent = on ? "🔊" : "🔇";
    sndBtn.classList.toggle("off", !on);
    sndBtn.title = t.sound;
    sndBtn.setAttribute("aria-label", t.sound);
  }
  function buildSndMenu() {
    var on = soundOn(), cur = getTone();
    sndMenu.innerHTML =
      '<button type="button" class="snd-toggle" data-act="toggle">' + (on ? "🔊 " + t.mute : "🔇 " + t.unmute) + "</button>" +
      '<div class="snd-title">' + t.sound + "</div>" +
      TONE_ORDER.map(function (k) {
        return '<button type="button" class="snd-tone' + (k === cur ? " on" : "") + '" data-tone="' + k + '">🎵 ' + t.tones[k] + "</button>";
      }).join("");
  }
  function menuOpen() { return !sndMenu.hidden; }
  function hideMenu() { sndMenu.hidden = true; }
  sndBtn.onclick = function () {
    if (menuOpen()) { hideMenu(); return; }
    hideEmo();
    buildSndMenu();
    sndMenu.hidden = false;
  };
  sndMenu.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("button");
    if (!b) return;
    if (b.getAttribute("data-act") === "toggle") {
      var turnOn = !soundOn();
      try { localStorage.setItem(SOUND_KEY, turnOn ? "1" : "0"); } catch (e2) {}
      applySound();
      buildSndMenu();
      if (turnOn) playSound(true);
      return;
    }
    var k = b.getAttribute("data-tone");
    if (k && TONES[k]) {
      try { localStorage.setItem(TONE_KEY, k); } catch (e3) {}
      buildSndMenu();
      playSound(true, k);
    }
  });
  applySound();

  // ---------- Pəncərə ölçüsü (kiçik / böyük) ----------
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

  // ---------- Emoji (kateqoriyalar + son istifadə olunanlar) ----------
  var CATS = [
    { i: "🕘", recent: true },
    { i: "😀", list: "😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 😉 😍 🥰 😘 😋 😎 🤩 🥳 🤗 🤔 😐 😴 😢 😭 😡 😱 🙄 😬 🤯 🥺 😏" },
    { i: "👍", list: "👍 👎 👌 ✌️ 🤞 🤝 👏 🙌 💪 👋 🙏 👀 🤙 ☝️ 👉 👈" },
    { i: "❤️", list: "❤️ 🧡 💛 💚 💙 💜 🖤 🤍 💔 💯 ✨ ⭐ 🔥 🎉 ✅ ❌ ⚠️ ❓ ❗ 💬" },
    { i: "🎁", list: "🎁 📎 📷 💳 💰 🛒 📦 🚀 🎧 🎬 🎮 📚 💻 📱 🔑 🔒 ⏰ 📅 📧 🌐" }
  ];
  var emoBox = document.getElementById("chatEmoji");
  var emoBtn = document.getElementById("chatEmoBtn");
  emoBtn.title = t.emoji;
  emoBtn.setAttribute("aria-label", t.emoji);
  var emoTabs = document.createElement("div");
  emoTabs.className = "emo-tabs";
  var emoGrid = document.createElement("div");
  emoGrid.className = "emo-grid";
  emoBox.appendChild(emoTabs);
  emoBox.appendChild(emoGrid);

  function getRecent() {
    try { var a = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); return Array.isArray(a) ? a.slice(0, 16) : []; } catch (e) { return []; }
  }
  function pushRecent(em) {
    var a = getRecent().filter(function (x) { return x !== em; });
    a.unshift(em);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(a.slice(0, 16))); } catch (e) {}
  }
  var curCat = 1;
  function insertEmoji(em) {
    var tx = document.getElementById("chatText");
    if (!tx) return;
    var s = tx.selectionStart, e2 = tx.selectionEnd;
    if (typeof s !== "number") { s = e2 = tx.value.length; }
    if (tx.value.length - (e2 - s) + em.length > (tx.maxLength > 0 ? tx.maxLength : 1000)) return;
    tx.setRangeText(em, s, e2, "end");
    tx.dispatchEvent(new Event("input", { bubbles: true }));
    pushRecent(em);
    if (window.innerWidth >= 900) tx.focus();
  }
  function renderEmoji() {
    emoTabs.innerHTML = "";
    CATS.forEach(function (c, idx) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = c.i;
      if (idx === curCat) b.className = "on";
      b.onclick = function () { curCat = idx; renderEmoji(); };
      emoTabs.appendChild(b);
    });
    emoGrid.innerHTML = "";
    var c = CATS[curCat];
    var list = c.recent ? getRecent() : c.list.split(" ");
    if (!list.length) {
      var em0 = document.createElement("div");
      em0.className = "emo-empty";
      em0.textContent = "🕘";
      emoGrid.appendChild(em0);
    }
    list.forEach(function (em) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = em;
      b.onclick = function () { insertEmoji(em); };
      emoGrid.appendChild(b);
    });
  }
  function emoOpen() { return emoBox.classList.contains("show"); }
  function hideEmo() {
    emoBox.classList.remove("show");
    emoBtn.setAttribute("aria-expanded", "false");
  }
  emoBtn.onclick = function () {
    var show = !emoOpen();
    if (show) {
      hideMenu();
      curCat = getRecent().length ? 0 : 1;
      renderEmoji();
    }
    emoBox.classList.toggle("show", show);
    emoBtn.setAttribute("aria-expanded", show ? "true" : "false");
  };
  document.addEventListener("click", function (e) {
    var tg = e.target;
    if (emoOpen() && !(tg.closest && tg.closest("#chatEmoji,#chatEmoBtn"))) hideEmo();
    if (menuOpen() && !(tg.closest && tg.closest("#chatSndMenu,#chatSnd"))) hideMenu();
  });

  // ---------- İş saatları ----------
  // Sayt parametrlərindəki hours_az (məs. "10:00–22:00") Bakı vaxtı ilə müqayisə olunur
  var hoursEl = document.getElementById("chatHours");
  var hoursTx = document.getElementById("chatHoursTx");
  var hoursWa = document.getElementById("chatHoursWa");
  function bakuMinutes() {
    try {
      var parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Baku", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
      var h = 0, m = 0;
      parts.forEach(function (p) { if (p.type === "hour") h = parseInt(p.value, 10) % 24; if (p.type === "minute") m = parseInt(p.value, 10); });
      return h * 60 + m;
    } catch (e) {
      var d = new Date();
      return ((d.getUTCHours() + 4) % 24) * 60 + d.getUTCMinutes();
    }
  }
  function hoursCheck() {
    var raw = window.DB && DB.settings && DB.settings.hours_az;
    var m = String(raw || "").match(/(\d{1,2})[:.](\d{2})\s*[–—-]\s*(\d{1,2})[:.](\d{2})/);
    if (!m) { hoursEl.hidden = true; panel.classList.remove("offline"); return false; }
    var s = (+m[1]) * 60 + (+m[2]), e = (+m[3]) * 60 + (+m[4]), n = bakuMinutes();
    var open = s === e ? true : (s < e ? (n >= s && n < e) : (n >= s || n < e));
    panel.classList.toggle("offline", !open);
    hoursEl.hidden = open;
    if (!open) {
      hoursTx.textContent = t.offline.replace("{h}", m[1] + ":" + m[2] + "–" + m[3] + ":" + m[4]);
      try { if (DB.waLink && DB.settings.whatsapp) { hoursWa.href = DB.waLink(""); hoursWa.hidden = false; } else hoursWa.hidden = true; } catch (er) { hoursWa.hidden = true; }
    }
    return true;
  }
  (function hoursSync(n) {
    if (window.DB && DB.settings && DB.settings.hours_az) { hoursCheck(); setInterval(hoursCheck, 60000); return; }
    if (n < 25) setTimeout(function () { hoursSync(n + 1); }, 400);
  })(0);

  // ---------- Oxunmamış mesaj nişanı və başlıq ----------
  var unread = 0, baseTitle = document.title, flashT = null, flashOn = false;
  function updateTitle() {
    if (unread > 0) {
      if (flashT) return;
      baseTitle = document.title;
      flashT = setInterval(function () {
        flashOn = !flashOn;
        document.title = flashOn ? "(" + unread + ") " + t.newMsg : baseTitle;
      }, 1200);
    } else if (flashT) {
      clearInterval(flashT);
      flashT = null;
      flashOn = false;
      document.title = baseTitle;
    }
  }
  function renderBadge() {
    var els = document.querySelectorAll("a.fab.chat");
    Array.prototype.forEach.call(els, function (a) {
      var b = a.querySelector(".db-badge");
      if (unread > 0) {
        if (!b) { b = document.createElement("span"); b.className = "db-badge"; a.appendChild(b); }
        b.textContent = unread > 9 ? "9+" : String(unread);
      } else if (b) {
        b.parentNode.removeChild(b);
      }
    });
    updateTitle();
  }
  // chat.js yeni mesaj gələndə bunu çağırır
  window.__dbChatNotify = {
    incoming: function (n) { if (isOpen) return; unread += n; renderBadge(); },
    seen: function (id) { setSeen(id); }
  };

  // Çat yüklənməyibsə (məs. başqa səhifəyə keçəndən sonra) yeni mesajları arxa planda yoxlayır
  var bgT = null, bgStart = Date.now();
  function bgSchedule() {
    clearTimeout(bgT);
    var age = Date.now() - bgStart;
    bgT = setTimeout(bgPoll, document.visibilityState === "hidden" ? 15000 : (age < 600000 ? 8000 : 30000));
  }
  function bgPoll() {
    var token = getToken();
    if (!token || loaded || loading || isOpen) { bgSchedule(); return; }
    var seen = getSeen();
    fetch("/api/chat?action=poll&token=" + encodeURIComponent(token) + "&after=" + (seen === null ? 0 : seen))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (loaded || loading || isOpen) return;
        if (d.notfound) { unread = 0; renderBadge(); return; }
        var msgs = d.messages || [], maxId = 0, n = 0;
        msgs.forEach(function (m) { if (m.id > maxId) maxId = m.id; if (m.sender !== "visitor") n++; });
        if (seen === null) { setSeen(maxId); return; }     // köhnə söhbət: tarixçə oxunmamış sayılmır
        if (n > unread) { unread = n; renderBadge(); playSound(false); }
        else if (n < unread) { unread = n; renderBadge(); }
        else if (unread > 0) renderBadge();
      })
      .catch(function () {})
      .then(bgSchedule);
  }

  // ---------- "Kömək lazımdır?" balonu (yalnız məhsul səhifəsində) ----------
  var greetEl = null, greetTimer = null;
  function removeGreet() {
    clearTimeout(greetTimer);
    if (greetEl && greetEl.parentNode) greetEl.parentNode.removeChild(greetEl);
    greetEl = null;
  }
  function placeGreet() {
    var fab = document.querySelector("a.fab.chat");
    if (!greetEl || !fab) return;
    var r = fab.getBoundingClientRect();
    greetEl.style.right = Math.round(window.innerWidth - r.left + 10) + "px";
    greetEl.style.top = Math.round(r.top + r.height / 2) + "px";
  }
  function showGreet() {
    if (isOpen || greetEl || getToken()) return;
    try { if (sessionStorage.getItem(GREET_KEY)) return; sessionStorage.setItem(GREET_KEY, "1"); } catch (e) {}
    if (!document.querySelector("a.fab.chat")) return;
    greetEl = document.createElement("div");
    greetEl.id = "dbChatGreet";
    var tx = document.createElement("span");
    tx.textContent = t.greet;
    var x = document.createElement("button");
    x.type = "button"; x.className = "g-x"; x.setAttribute("aria-label", t.close); x.textContent = "×";
    greetEl.appendChild(tx);
    greetEl.appendChild(x);
    greetEl.onclick = function (e) {
      if (e.target === x) { removeGreet(); return; }
      removeGreet();
      open();
    };
    document.body.appendChild(greetEl);
    placeGreet();
    greetTimer = setTimeout(removeGreet, 20000);
  }
  window.addEventListener("resize", placeGreet);
  if (/\/product(\.html)?\/?$/.test(location.pathname)) {
    var gSeen = false;
    try { gSeen = !!sessionStorage.getItem(GREET_KEY); } catch (e) {}
    if (!gSeen) setTimeout(showGreet, 25000);
  }

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
    removeGreet();
    unread = 0;
    renderBadge();
    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("db-chat-open");
    try { sessionStorage.setItem(OPEN_KEY, "1"); } catch (e) {}
    loadChat(function () {
      if (window.__dbChatState) setSeen(window.__dbChatState.lastId());
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
    hideMenu();
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("db-chat-open");
    try { sessionStorage.removeItem(OPEN_KEY); } catch (e) {}
  }

  document.getElementById("chatClose").onclick = close;
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (emoOpen()) { hideEmo(); return; }
    if (menuOpen()) { hideMenu(); return; }
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
  renderBadge();

  // Masaüstündə səhifə dəyişəndə çat açıq qalır
  try {
    if (!isOpen && sessionStorage.getItem(OPEN_KEY) === "1" && window.innerWidth >= 900) open(false);
  } catch (e) {}

  bgSchedule();
})();

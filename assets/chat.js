/* DigiBaku çatı (ziyarətçi tərəfi)
   - mesaj göndərilən kimi ekranda görünür, cavab gözlənilərkən "yazır..." göstərilir
   - bot cavabları məhsul kartı və düymə kimi göstərilir (xam link yoxdur, bax: chat-render.js)
   - sürətli sual düymələri həmişə görünür, söhbət tarixi səhifə yenilənəndə bərpa olunur */
(function () {
  var KEY = "digibaku_chat";
  var lang = (window.DB && DB.lang) || "az";
  var TX = {
    az: { hello: "Salam! 👋 Mən DigiBaku-nun çat köməkçisiyəm. Məhsullar, qiymətlər, sifariş və sayt haqqında soruşa bilərsiniz. Yazın və ya aşağıdakı düymələrdən birini seçin.",
      sub: "Avtomatik köməkçi", name: "Adınız (istəyə bağlı)",
      rateQ: "Xidmətimizi qiymətləndirin", up: "👍 Yaxşı idi", down: "👎 Yaxşı deyildi", thanks: "Təşəkkür edirik! 🙏",
      ph: "Mesajınızı yazın...", send: "Göndər", bot: "DigiBaku · avto cavab", op: "DigiBaku · operator",
      err: "Mesaj göndərilmədi. Bir az sonra yenidən cəhd edin.", today: "Bu gün", yest: "Dünən",
      newChat: "Yeni söhbət", confirmNew: "Yeni söhbət başladılsın? Əvvəlki yazışma bu cihazdan silinəcək.",
      q: ["Salam, necəsən?", "Saytınız haqqında", "Məhsullar", "Qiymətlər", "Necə sifariş edim?", "Operator"],
      qs: ["Salam, necəsən?", "Saytınız haqqında danışın", "Hansı məhsullar var?", "Qiymətlər nə qədərdir?", "Necə sifariş edim?", "Operator ilə danışmaq istəyirəm"] },
    ru: { hello: "Здравствуйте! 👋 Я помощник DigiBaku. Спросите о товарах, ценах, заказе или о сайте. Напишите вопрос или выберите кнопку ниже.",
      sub: "Авто-помощник", name: "Ваше имя (необязательно)",
      rateQ: "Оцените наш сервис", up: "👍 Хорошо", down: "👎 Плохо", thanks: "Спасибо! 🙏",
      ph: "Напишите сообщение...", send: "Отправить", bot: "DigiBaku · авто-ответ", op: "DigiBaku · оператор",
      err: "Сообщение не отправлено. Попробуйте позже.", today: "Сегодня", yest: "Вчера",
      newChat: "Новый чат", confirmNew: "Начать новый чат? Прежняя переписка будет удалена с этого устройства.",
      q: ["Привет, как дела?", "О сайте", "Товары", "Цены", "Как заказать?", "Оператор"],
      qs: ["Здравствуйте, как дела?", "Расскажите о сайте", "Какие есть товары?", "Сколько стоят товары?", "Как заказать?", "Хочу поговорить с оператором"] },
    en: { hello: "Hello! 👋 I'm the DigiBaku chat assistant. Ask about products, prices, ordering or the site. Write your question or pick a button below.",
      sub: "Auto assistant", name: "Your name (optional)",
      rateQ: "Rate our support", up: "👍 Good", down: "👎 Bad", thanks: "Thank you! 🙏",
      ph: "Type your message...", send: "Send", bot: "DigiBaku · auto reply", op: "DigiBaku · operator",
      err: "Message could not be sent. Please try again later.", today: "Today", yest: "Yesterday",
      newChat: "New chat", confirmNew: "Start a new chat? The previous conversation will be removed from this device.",
      q: ["Hi, how are you?", "About the site", "Products", "Prices", "How to order?", "Operator"],
      qs: ["Hi, how are you?", "Tell me about the site", "What products do you have?", "How much do products cost?", "How to order?", "I want to talk to an operator"] }
  };
  var t = TX[lang] || TX.az;

  var box = document.getElementById("chatMsgs");
  var nameEl = document.getElementById("chatName");
  var textEl = document.getElementById("chatText");
  var sendBtn = document.getElementById("chatSend");
  var errEl = document.getElementById("chatErr");
  var quickEl = document.getElementById("chatQuick");
  var waEl = document.getElementById("chatWa");
  var newBtn = document.getElementById("chatNew");
  var subEl = document.getElementById("chatSub");
  if (!box || !textEl) return;

  var token = "";
  try { token = localStorage.getItem(KEY) || ""; } catch (e) {}
  var lastId = 0, seen = {}, lastDay = "", sending = false, typingEl = null;
  var timer = null, lastActivity = Date.now();
  var DRAFT_KEY = "digibaku_chat_draft", SEEN_KEY = "digibaku_chat_seen", RATE_KEY = "digibaku_chat_rate";
  var rated = null, rateEl = null, hasOp = false, lastMsgAt = 0, lastSender = "", threadStatus = "open", opTyping = false;
  var ready = false;   // ilk yükləmədən sonra gələn yeni mesajlarda səs çalınır

  function fmtTime(d) {
    try { return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); } catch (e) { return ""; }
  }
  function dayKey(d) {
    var x = new Date(d);
    return x.getFullYear() + "-" + x.getMonth() + "-" + x.getDate();
  }
  function dayLabel(d) {
    var x = new Date(d), n = new Date();
    if (dayKey(x) === dayKey(n)) return t.today;
    var y = new Date(n.getFullYear(), n.getMonth(), n.getDate() - 1);
    if (dayKey(x) === dayKey(y)) return t.yest;
    try { return x.toLocaleDateString(lang === "az" ? "az-AZ" : lang, { day: "numeric", month: "long" }); } catch (e) { return ""; }
  }
  function scrollDown() { box.scrollTop = box.scrollHeight; }
  function saveDraft(v) {
    try { if (v) localStorage.setItem(DRAFT_KEY, v); else localStorage.removeItem(DRAFT_KEY); } catch (e) {}
  }
  function autosize() {
    textEl.style.height = "auto";
    textEl.style.height = Math.min(textEl.scrollHeight, 120) + "px";
  }

  function addDay(date) {
    var k = dayKey(date);
    if (k === lastDay) return;
    lastDay = k;
    var el = document.createElement("div");
    el.className = "cm-day";
    el.textContent = dayLabel(date);
    box.appendChild(el);
  }

  function bubble(m, pending) {
    var mine = m.sender === "visitor";
    var row = document.createElement("div");
    row.className = "cm-row " + (mine ? "me" : "them") + (pending ? " pending" : "");
    var b = document.createElement("div");
    b.className = "cm-b";
    if (m.file_id) b.appendChild(fileEl(m));
    else if (mine) b.textContent = m.body;            // ziyarətçi mətni heç vaxt HTML kimi oxunmur
    else b.innerHTML = window.ChatRender ? ChatRender.html(m.body) : "";
    var meta = document.createElement("div");
    meta.className = "cm-meta";
    meta.textContent = (mine ? "" : (m.is_bot ? t.bot : t.op) + " · ") + fmtTime(m.created_at);
    row.appendChild(b);
    row.appendChild(meta);
    return row;
  }

  // ---------- Fayl göndərmə ----------
  var FTX = {
    az: { attach: "Fayl əlavə et", type: "Bu fayl növü qəbul olunmur (JPG, PNG, WEBP, GIF, PDF, TXT, DOCX, XLSX).", big: "Fayl çox böyükdür (maksimum 2.5 MB)." },
    ru: { attach: "Прикрепить файл", type: "Этот тип файла не поддерживается (JPG, PNG, WEBP, GIF, PDF, TXT, DOCX, XLSX).", big: "Файл слишком большой (максимум 2.5 МБ)." },
    en: { attach: "Attach file", type: "This file type is not supported (JPG, PNG, WEBP, GIF, PDF, TXT, DOCX, XLSX).", big: "File is too large (max 2.5 MB)." }
  };
  var FT = FTX[lang] || FTX.az;
  var FILE_EXT = ["jpg", "jpeg", "png", "webp", "gif", "pdf", "txt", "docx", "xlsx"];
  var MAX_FILE = 2.5 * 1024 * 1024;
  var attachBtn = document.getElementById("chatAttach");
  var fileInput = document.getElementById("chatFile");

  function fmtSize(n) {
    n = Number(n) || 0;
    return n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB";
  }
  function fileEl(m) {
    var url = "/api/chat?action=file&id=" + encodeURIComponent(m.file_id);
    var a = document.createElement("a");
    a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer"; a.className = "cm-file";
    if (/^image\//.test(m.file_type || "")) {
      var im = document.createElement("img");
      im.src = url; im.alt = m.file_name || ""; im.loading = "lazy";
      im.onload = function () { scrollDown(); };
      a.className = "cm-file img";
      a.appendChild(im);
    } else {
      var ic = document.createElement("span"); ic.textContent = "📎";
      var tx = document.createElement("span"); tx.className = "cm-file-t";
      tx.textContent = (m.file_name || "file") + (m.file_size ? " · " + fmtSize(m.file_size) : "");
      a.appendChild(ic); a.appendChild(tx);
    }
    return a;
  }
  function readB64(blob) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(String(fr.result).split(",")[1] || ""); };
      fr.onerror = function () { reject(new Error(t.err)); };
      fr.readAsDataURL(blob);
    });
  }
  // Böyük şəkilləri göndərmədən əvvəl kiçildir (telefon şəkilləri adətən 3-8 MB olur)
  function prepare(file) {
    return new Promise(function (resolve) {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 500 * 1024) return resolve(file);
      var fr = new FileReader();
      fr.onerror = function () { resolve(file); };
      fr.onload = function () {
        var img = new Image();
        img.onerror = function () { resolve(file); };
        img.onload = function () {
          var s = Math.min(1, 1600 / Math.max(img.width, img.height));
          var c = document.createElement("canvas");
          c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
          var x = c.getContext("2d");
          x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
          x.drawImage(img, 0, 0, c.width, c.height);
          c.toBlob(function (bl) {
            if (!bl || bl.size >= file.size) return resolve(file);
            resolve(new File([bl], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }));
          }, "image/jpeg", 0.82);
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  async function sendFile(file) {
    if (sending || !file) return;
    errEl.textContent = "";
    var ext = (file.name.split(".").pop() || "").toLowerCase();
    if (FILE_EXT.indexOf(ext) < 0) { errEl.textContent = FT.type; return; }
    sending = true;
    sendBtn.disabled = true;
    if (attachBtn) attachBtn.disabled = true;

    var now = new Date().toISOString();
    addDay(now);
    removeRate();
    var pend = bubble({ sender: "visitor", body: "📎 " + file.name, created_at: now }, true);
    box.appendChild(pend);
    scrollDown();

    try {
      file = await prepare(file);
      if (file.size > MAX_FILE) throw new Error(FT.big);
      var data = await readB64(file);
      var r = await fetch("/api/chat?action=upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token, name: nameEl.value, file_name: file.name, data: data, lang: lang })
      });
      var d = await r.json().catch(function () { return {}; });
      if (!r.ok || !d.ok) throw new Error(d.error || t.err);
      if (d.token && d.token !== token) {
        token = d.token;
        try { localStorage.setItem(KEY, token); } catch (e) {}
        nameEl.style.display = "none";
      }
      if (pend.parentNode) pend.parentNode.removeChild(pend);
      addMessages([d.message]);
      if (d.bot) addMessages([d.bot]);
      scrollDown();
    } catch (e) {
      if (pend.parentNode) pend.parentNode.removeChild(pend);
      errEl.textContent = (e && e.message && e.message !== "Failed to fetch") ? e.message : t.err;
    }
    sending = false;
    sendBtn.disabled = false;
    if (attachBtn) attachBtn.disabled = false;
    lastActivity = Date.now();
    schedule();
  }

  function addMessages(list) {
    var added = false, inCount = 0;
    list.forEach(function (m) {
      if (!m || seen[m.id]) return;
      seen[m.id] = true;
      if (m.id > lastId) lastId = m.id;
      addDay(m.created_at);
      box.appendChild(bubble(m, false));
      added = true;
      lastSender = m.sender;
      var ts = Date.parse(m.created_at);
      if (ts) lastMsgAt = ts;
      if (m.sender === "visitor") { removeRate(); }
      else {
        inCount++;
        if (!m.is_bot) hasOp = true;
      }
    });
    if (added) {
      scrollDown();
      var N = window.__dbChatNotify, pn = document.getElementById("dbChatPanel");
      var open = !!(pn && pn.classList.contains("open"));
      if (N) { if (open) N.seen(lastId); else if (inCount && ready) N.incoming(inCount); }
      if (inCount && ready && window.__dbChatSound) window.__dbChatSound.play();
    }
    return added;
  }

  // ---------- Qiymətləndirmə ----------
  function removeRate() {
    if (rateEl && rateEl.parentNode) rateEl.parentNode.removeChild(rateEl);
    rateEl = null;
  }
  async function sendRate(v) {
    try {
      var r = await fetch("/api/chat?action=rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token, value: v })
      });
      var d = await r.json().catch(function () { return {}; });
      if (!r.ok || !d.ok) throw new Error(t.err);
      rated = v;
      if (rateEl) { rateEl.textContent = t.thanks; scrollDown(); }
    } catch (e) {
      errEl.textContent = t.err;
    }
  }
  function showRate() {
    try { sessionStorage.setItem(RATE_KEY, token); } catch (e) {}
    rateEl = document.createElement("div");
    rateEl.className = "cm-rate";
    var q = document.createElement("span");
    q.textContent = t.rateQ;
    var row = document.createElement("div");
    [[1, t.up], [-1, t.down]].forEach(function (x) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = x[1];
      b.onclick = function () { sendRate(x[0]); };
      row.appendChild(b);
    });
    rateEl.appendChild(q);
    rateEl.appendChild(row);
    box.appendChild(rateEl);
    scrollDown();
  }
  // Operator cavab veribsə və söhbət bağlanıbsa (və ya 5 dəqiqə sakitdirsə) bir dəfə soruşulur
  function maybeRate() {
    if (!token || rated !== null || rateEl || !hasOp || lastSender !== "admin") return;
    try { if (sessionStorage.getItem(RATE_KEY) === token) return; } catch (e) {}
    if (threadStatus !== "closed" && Date.now() - lastMsgAt < 300000) return;
    showRate();
  }

  function showTyping() {
    hideTyping();
    typingEl = document.createElement("div");
    typingEl.className = "cm-row them";
    typingEl.innerHTML = '<div class="cm-b"><span class="cm-typing"><i></i><i></i><i></i></span></div>';
    box.appendChild(typingEl);
    scrollDown();
  }
  function hideTyping() {
    if (typingEl && typingEl.parentNode) typingEl.parentNode.removeChild(typingEl);
    typingEl = null;
  }

  function intro() {
    var row = document.createElement("div");
    row.className = "cm-row them";
    var b = document.createElement("div");
    b.className = "cm-b";
    b.textContent = t.hello;
    row.appendChild(b);
    box.appendChild(row);
  }

  function reset() {
    try { localStorage.removeItem(KEY); } catch (e) {}
    token = ""; lastId = 0; seen = {}; lastDay = ""; ready = true;
    rated = null; rateEl = null; hasOp = false; lastMsgAt = 0; lastSender = ""; threadStatus = "open"; opTyping = false; typingEl = null;
    try { localStorage.removeItem(SEEN_KEY); } catch (e) {}
    box.innerHTML = "";
    intro();
    nameEl.style.display = "";
    errEl.textContent = "";
  }

  async function poll() {
    if (!token || sending || document.visibilityState === "hidden") return;
    try {
      var r = await fetch("/api/chat?action=poll&token=" + encodeURIComponent(token) + "&after=" + lastId);
      var d = await r.json();
      if (sending) return;
      if (d.notfound) { reset(); return; }
      var hasNew = !!(d.messages && d.messages.length);
      // "Operator yazır..." göstəricisi yeni mesaj gələndə və ya yazmağı dayandıranda silinir
      if (opTyping && (hasNew || !d.typing)) { hideTyping(); opTyping = false; }
      if (hasNew && addMessages(d.messages)) lastActivity = Date.now();
      ready = true;
      threadStatus = d.status || threadStatus;
      if (d.rating !== undefined && d.rating !== null) rated = d.rating;
      if (d.typing && !typingEl) { showTyping(); opTyping = true; }
      maybeRate();
    } catch (e) {}
  }

  // Yaxın vaxtda aktivlik olubsa tez-tez, yoxsa seyrək yoxlanılır
  function schedule() {
    clearTimeout(timer);
    var idle = Date.now() - lastActivity;
    timer = setTimeout(async function () { await poll(); schedule(); }, idle < 120000 ? 4000 : 12000);
  }

  async function send(preset) {
    if (sending) return;
    var fromInput = typeof preset !== "string";
    var text = (fromInput ? textEl.value : preset).trim();
    if (!text) return;
    errEl.textContent = "";
    sending = true;
    sendBtn.disabled = true;

    var now = new Date().toISOString();
    addDay(now);
    var pend = bubble({ sender: "visitor", body: text, created_at: now }, true);
    box.appendChild(pend);
    if (fromInput) { textEl.value = ""; autosize(); saveDraft(""); }
    removeRate();
    showTyping();

    try {
      var r = await fetch("/api/chat?action=send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token, name: nameEl.value, body: text, lang: lang })
      });
      var d = await r.json().catch(function () { return {}; });
      if (!r.ok || !d.ok) throw new Error(d.error || t.err);
      if (d.token && d.token !== token) {
        token = d.token;
        try { localStorage.setItem(KEY, token); } catch (e) {}
        nameEl.style.display = "none";
      }
      if (pend.parentNode) pend.parentNode.removeChild(pend);
      hideTyping();
      addMessages([d.message]);
      if (d.bot) addMessages([d.bot]);
      scrollDown();
    } catch (e) {
      if (pend.parentNode) pend.parentNode.removeChild(pend);
      hideTyping();
      if (fromInput) { textEl.value = text; autosize(); saveDraft(text); }
      errEl.textContent = (e && e.message && e.message !== "Failed to fetch") ? e.message : t.err;
    }
    sending = false;
    sendBtn.disabled = false;
    lastActivity = Date.now();
    schedule();
    if (fromInput) textEl.focus();
  }

  // ---------- Başlanğıc ----------
  document.getElementById("chatTitle").textContent = "DigiBaku";
  subEl.textContent = t.sub;
  nameEl.placeholder = t.name;
  textEl.placeholder = t.ph;
  sendBtn.setAttribute("aria-label", t.send);
  newBtn.setAttribute("aria-label", t.newChat);
  newBtn.title = t.newChat;

  t.q.forEach(function (label, i) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.onclick = function () { send(t.qs[i]); };
    quickEl.appendChild(b);
  });

  sendBtn.onclick = function () { send(); };
  if (attachBtn && fileInput) {
    attachBtn.title = FT.attach;
    attachBtn.setAttribute("aria-label", FT.attach);
    attachBtn.onclick = function () { if (!sending) fileInput.click(); };
    fileInput.onchange = function () {
      var f = fileInput.files && fileInput.files[0];
      fileInput.value = "";
      if (f) sendFile(f);
    };
  }
  textEl.addEventListener("input", autosize);
  textEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); }
  });
  newBtn.onclick = function () {
    if (!token && !lastId) return;
    if (confirm(t.confirmNew)) reset();
  };
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") { poll(); schedule(); }
  });

  // WhatsApp düyməsi: nömrə sayt parametrlərindən gec gəlir, gələndə göstərilir
  (function waSync(n) {
    if (window.DB && DB.settings && DB.settings.whatsapp) {
      waEl.href = DB.waLink("");
      waEl.hidden = false;
      return;
    }
    if (n < 25) setTimeout(function () { waSync(n + 1); }, 400);
  })(0);

  textEl.addEventListener("input", function () { saveDraft(textEl.value); });
  try {
    var dr = localStorage.getItem(DRAFT_KEY);
    if (dr) { textEl.value = dr; autosize(); }
  } catch (e) {}

  // Ctrl+V ilə şəkil/fayl yapışdırma və sürüşdürüb buraxma
  function withName(f) {
    if (f.name && /\.[A-Za-z0-9]{1,5}$/.test(f.name)) return f;
    var ext = ((f.type || "image/png").split("/")[1] || "png").replace("jpeg", "jpg");
    try { return new File([f], "image-" + Date.now() + "." + ext, { type: f.type }); } catch (e) { return f; }
  }
  textEl.addEventListener("paste", function (e) {
    var cd = e.clipboardData;
    if (!cd || !cd.files || !cd.files.length) return;
    if (cd.getData("text/plain")) return;     // mətn də varsa adi yapışdırma
    e.preventDefault();
    sendFile(withName(cd.files[0]));
  });
  var panelEl = document.getElementById("dbChatPanel"), dragN = 0;
  function hasFiles(e) {
    var dt = e.dataTransfer;
    return !!(dt && dt.types && Array.prototype.indexOf.call(dt.types, "Files") >= 0);
  }
  if (panelEl) {
    panelEl.addEventListener("dragenter", function (e) { if (hasFiles(e)) { e.preventDefault(); dragN++; panelEl.classList.add("drag"); } });
    panelEl.addEventListener("dragover", function (e) { if (hasFiles(e)) e.preventDefault(); });
    panelEl.addEventListener("dragleave", function (e) {
      if (!hasFiles(e)) return;
      dragN = Math.max(0, dragN - 1);
      if (!dragN) panelEl.classList.remove("drag");
    });
    panelEl.addEventListener("drop", function (e) {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragN = 0;
      panelEl.classList.remove("drag");
      var f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) sendFile(withName(f));
    });
  }

  window.__dbChatState = { lastId: function () { return lastId; } };

  intro();
  if (token) nameEl.style.display = "none"; else ready = true;
  poll();
  schedule();
})();

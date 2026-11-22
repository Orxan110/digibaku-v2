/* DigiBaku çatı (ziyarətçi tərəfi)
   - mesaj göndərilən kimi ekranda görünür, cavab gözlənilərkən "yazır..." göstərilir
   - bot cavabları məhsul kartı və düymə kimi göstərilir (xam link yoxdur, bax: chat-render.js)
   - sürətli sual düymələri həmişə görünür, söhbət tarixi səhifə yenilənəndə bərpa olunur */
(function () {
  var KEY = "digibaku_chat";
  var lang = (window.DB && DB.lang) || "az";
  var TX = {
    az: { hello: "Salam! 👋 Sualınızı yazın və ya aşağıdakı düymələrdən birini seçin.",
      sub: "Avtomatik köməkçi", name: "Adınız (istəyə bağlı)",
      ph: "Mesajınızı yazın...", send: "Göndər", bot: "DigiBaku · avto cavab", op: "DigiBaku · operator",
      err: "Mesaj göndərilmədi. Bir az sonra yenidən cəhd edin.", today: "Bu gün", yest: "Dünən",
      newChat: "Yeni söhbət", confirmNew: "Yeni söhbət başladılsın? Əvvəlki yazışma bu cihazdan silinəcək.",
      q: ["Məhsullar", "Qiymətlər", "Necə sifariş edim?", "Operatorla əlaqə"],
      qs: ["Hansı məhsullar var?", "Qiymətlər nə qədərdir?", "Necə sifariş edim?", "Operator ilə danışmaq istəyirəm"] },
    ru: { hello: "Здравствуйте! 👋 Напишите вопрос или выберите кнопку ниже.",
      sub: "Авто-помощник", name: "Ваше имя (необязательно)",
      ph: "Напишите сообщение...", send: "Отправить", bot: "DigiBaku · авто-ответ", op: "DigiBaku · оператор",
      err: "Сообщение не отправлено. Попробуйте позже.", today: "Сегодня", yest: "Вчера",
      newChat: "Новый чат", confirmNew: "Начать новый чат? Прежняя переписка будет удалена с этого устройства.",
      q: ["Товары", "Цены", "Как заказать?", "Связь с оператором"],
      qs: ["Какие есть товары?", "Сколько стоят товары?", "Как заказать?", "Хочу поговорить с оператором"] },
    en: { hello: "Hello! 👋 Write your question or pick a button below.",
      sub: "Auto assistant", name: "Your name (optional)",
      ph: "Type your message...", send: "Send", bot: "DigiBaku · auto reply", op: "DigiBaku · operator",
      err: "Message could not be sent. Please try again later.", today: "Today", yest: "Yesterday",
      newChat: "New chat", confirmNew: "Start a new chat? The previous conversation will be removed from this device.",
      q: ["Products", "Prices", "How to order?", "Talk to operator"],
      qs: ["What products do you have?", "How much do products cost?", "How to order?", "I want to talk to an operator"] }
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
    if (mine) b.textContent = m.body;                 // ziyarətçi mətni heç vaxt HTML kimi oxunmur
    else b.innerHTML = window.ChatRender ? ChatRender.html(m.body) : "";
    var meta = document.createElement("div");
    meta.className = "cm-meta";
    meta.textContent = (mine ? "" : (m.is_bot ? t.bot : t.op) + " · ") + fmtTime(m.created_at);
    row.appendChild(b);
    row.appendChild(meta);
    return row;
  }

  function addMessages(list) {
    var added = false;
    list.forEach(function (m) {
      if (!m || seen[m.id]) return;
      seen[m.id] = true;
      if (m.id > lastId) lastId = m.id;
      addDay(m.created_at);
      box.appendChild(bubble(m, false));
      added = true;
    });
    if (added) scrollDown();
    return added;
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
    token = ""; lastId = 0; seen = {}; lastDay = "";
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
      if (d.messages && addMessages(d.messages)) lastActivity = Date.now();
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
    if (fromInput) { textEl.value = ""; autosize(); }
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
      if (fromInput) { textEl.value = text; autosize(); }
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

  intro();
  if (token) nameEl.style.display = "none";
  poll();
  schedule();
})();

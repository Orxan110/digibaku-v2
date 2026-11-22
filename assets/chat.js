(function () {
  var KEY = "digibaku_chat";
  var lang = (window.DB && DB.lang) || "az";
  var TX = {
    az: { hello: "Salam! Sualınızı yazın və ya aşağıdakı düymələrdən birini seçin.", name: "Adınız (istəyə bağlı)",
      ph: "Mesajınızı yazın...", send: "Göndər", you: "Siz", team: "DigiBaku", bot: "DigiBaku · avto cavab", err: "Mesaj göndərilmədi.",
      q: ["Məhsullar", "Qiymətlər", "Necə sifariş edim?", "Operatorla əlaqə"],
      qs: ["Hansı məhsullar var?", "Qiymətlər nə qədərdir?", "Necə sifariş edim?", "Operator ilə danışmaq istəyirəm"] },
    ru: { hello: "Здравствуйте! Напишите вопрос или выберите кнопку ниже.", name: "Ваше имя (необязательно)",
      ph: "Напишите сообщение...", send: "Отправить", you: "Вы", team: "DigiBaku", bot: "DigiBaku · авто-ответ", err: "Сообщение не отправлено.",
      q: ["Товары", "Цены", "Как заказать?", "Связь с оператором"],
      qs: ["Какие есть товары?", "Сколько стоят товары?", "Как заказать?", "Хочу поговорить с оператором"] },
    en: { hello: "Hello! Write your question or pick a button below.", name: "Your name (optional)",
      ph: "Type your message...", send: "Send", you: "You", team: "DigiBaku", bot: "DigiBaku · auto reply", err: "Message could not be sent.",
      q: ["Products", "Prices", "How to order?", "Talk to operator"],
      qs: ["What products do you have?", "How much do products cost?", "How to order?", "I want to talk to an operator"] }
  };
  var t = TX[lang] || TX.az;

  var box = document.getElementById("chatMsgs");
  var nameEl = document.getElementById("chatName");
  var textEl = document.getElementById("chatText");
  var sendBtn = document.getElementById("chatSend");
  var errEl = document.getElementById("chatErr");
  if (!box) return;

  var token = "";
  try { token = localStorage.getItem(KEY) || ""; } catch (e) {}
  var lastId = 0;
  var seen = {};
  var timer = null;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  // Mətndəki məhsul/WhatsApp keçidləri kliklənən olur (əvvəlcə escape edilir)
  function linkify(html) {
    return html.replace(/(https:\/\/wa\.me\/\d+|(?:product|products)\.html(?:\?slug=[A-Za-z0-9%_\-]+)?)/g, function (u) {
      var ext = u.indexOf("http") === 0;
      return '<a href="' + u + '"' + (ext ? ' target="_blank" rel="noopener"' : "") +
        ' style="color:#d4af37;text-decoration:underline;word-break:break-all">' + u + "</a>";
    });
  }
  function fmt(d) {
    try { return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); } catch (e) { return ""; }
  }

  function bubble(m) {
    var mine = m.sender === "visitor";
    var el = document.createElement("div");
    el.style.cssText = "display:flex;flex-direction:column;align-items:" + (mine ? "flex-end" : "flex-start") + ";margin-bottom:10px";
    el.innerHTML = '<div style="max-width:88%;padding:10px 14px;border-radius:16px;white-space:pre-wrap;word-break:break-word;' +
      (mine ? "background:#d4af37;color:#000" : "background:#1a1a1a;color:#f5f5f5;border:1px solid #262626") + '">' +
      (mine ? esc(m.body) : linkify(esc(m.body))) + "</div>" +
      '<span class="muted" style="font-size:11px;margin-top:3px">' + esc(mine ? t.you : (m.is_bot ? t.bot : t.team)) + " · " + esc(fmt(m.created_at)) + "</span>";
    return el;
  }

  function addMessages(list) {
    var added = false;
    list.forEach(function (m) {
      if (!m || seen[m.id]) return;
      seen[m.id] = true;
      if (m.id > lastId) lastId = m.id;
      box.appendChild(bubble(m));
      added = true;
    });
    if (added) box.scrollTop = box.scrollHeight;
  }

  function intro() {
    var el = document.createElement("div");
    el.style.cssText = "margin-bottom:10px";
    el.innerHTML = '<div style="max-width:88%;padding:10px 14px;border-radius:16px;background:#1a1a1a;color:#f5f5f5;border:1px solid #262626">' +
      esc(t.hello) + "</div>";
    box.appendChild(el);

    var q = document.createElement("div");
    q.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px";
    t.q.forEach(function (label, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "btn";
      b.textContent = label;
      b.onclick = function () { send(t.qs[i]); };
      q.appendChild(b);
    });
    box.appendChild(q);
  }

  async function poll() {
    if (!token || document.visibilityState === "hidden") return;
    try {
      var r = await fetch("/api/chat?action=poll&token=" + encodeURIComponent(token) + "&after=" + lastId);
      var d = await r.json();
      if (d.notfound) {
        try { localStorage.removeItem(KEY); } catch (e) {}
        token = ""; lastId = 0; seen = {};
        nameEl.style.display = "";
        return;
      }
      if (d.messages) addMessages(d.messages);
    } catch (e) {}
  }

  async function send(preset) {
    var text = (typeof preset === "string" ? preset : textEl.value).trim();
    if (!text) return;
    errEl.textContent = "";
    sendBtn.disabled = true;
    try {
      var r = await fetch("/api/chat?action=send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token, name: nameEl.value, body: text, lang: lang })
      });
      var d = await r.json();
      if (!r.ok || !d.ok) { errEl.textContent = d.error || t.err; sendBtn.disabled = false; return; }
      if (d.token && d.token !== token) {
        token = d.token;
        try { localStorage.setItem(KEY, token); } catch (e) {}
        nameEl.style.display = "none";
      }
      if (typeof preset !== "string") textEl.value = "";
      addMessages([d.message]);
      if (d.bot) setTimeout(function () { addMessages([d.bot]); }, 500);
    } catch (e) {
      errEl.textContent = t.err;
    }
    sendBtn.disabled = false;
    if (typeof preset !== "string") textEl.focus();
  }

  nameEl.placeholder = t.name;
  textEl.placeholder = t.ph;
  sendBtn.textContent = t.send;
  sendBtn.onclick = function () { send(); };
  textEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  });

  intro();
  if (token) nameEl.style.display = "none";
  poll();
  timer = setInterval(poll, 5000);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") poll(); });
})();

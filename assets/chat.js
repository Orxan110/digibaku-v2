(function () {
  var KEY = "digibaku_chat";
  var lang = (window.DB && DB.lang) || "az";
  var TX = {
    az: { hello: "Salam! Sualınızı yazın, ən qısa zamanda cavab verəcəyik.", name: "Adınız (istəyə bağlı)",
      ph: "Mesajınızı yazın...", send: "Göndər", you: "Siz", team: "DigiBaku", err: "Mesaj göndərilmədi." },
    ru: { hello: "Здравствуйте! Напишите свой вопрос, мы ответим как можно скорее.", name: "Ваше имя (необязательно)",
      ph: "Напишите сообщение...", send: "Отправить", you: "Вы", team: "DigiBaku", err: "Сообщение не отправлено." },
    en: { hello: "Hello! Write your question and we will reply as soon as possible.", name: "Your name (optional)",
      ph: "Type your message...", send: "Send", you: "You", team: "DigiBaku", err: "Message could not be sent." }
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
  var timer = null;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function fmt(d) {
    try { return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); } catch (e) { return ""; }
  }

  function bubble(m) {
    var mine = m.sender === "visitor";
    var el = document.createElement("div");
    el.style.cssText = "display:flex;flex-direction:column;align-items:" + (mine ? "flex-end" : "flex-start") + ";margin-bottom:10px";
    el.innerHTML = '<div style="max-width:85%;padding:10px 14px;border-radius:16px;white-space:pre-wrap;word-break:break-word;' +
      (mine ? "background:#d4af37;color:#000" : "background:#1a1a1a;color:#f5f5f5;border:1px solid #262626") + '">' +
      esc(m.body) + "</div>" +
      '<span class="muted" style="font-size:11px;margin-top:3px">' + esc(mine ? t.you : t.team) + " · " + esc(fmt(m.created_at)) + "</span>";
    return el;
  }

  function addMessages(list) {
    if (!list.length) return;
    list.forEach(function (m) {
      if (m.id > lastId) lastId = m.id;
      box.appendChild(bubble(m));
    });
    box.scrollTop = box.scrollHeight;
  }

  function intro() {
    var el = document.createElement("div");
    el.style.cssText = "margin-bottom:10px";
    el.innerHTML = '<div style="max-width:85%;padding:10px 14px;border-radius:16px;background:#1a1a1a;color:#f5f5f5;border:1px solid #262626">' +
      esc(t.hello) + "</div>";
    box.appendChild(el);
  }

  async function poll() {
    if (!token || document.visibilityState === "hidden") return;
    try {
      var r = await fetch("/api/chat?action=poll&token=" + encodeURIComponent(token) + "&after=" + lastId);
      var d = await r.json();
      if (d.notfound) {
        try { localStorage.removeItem(KEY); } catch (e) {}
        token = ""; lastId = 0;
        nameEl.style.display = "";
        return;
      }
      if (d.messages) addMessages(d.messages);
    } catch (e) {}
  }

  async function send() {
    var text = textEl.value.trim();
    if (!text) return;
    errEl.textContent = "";
    sendBtn.disabled = true;
    try {
      var r = await fetch("/api/chat?action=send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token, name: nameEl.value, body: text })
      });
      var d = await r.json();
      if (!r.ok || !d.ok) { errEl.textContent = d.error || t.err; sendBtn.disabled = false; return; }
      if (d.token && d.token !== token) {
        token = d.token;
        try { localStorage.setItem(KEY, token); } catch (e) {}
        nameEl.style.display = "none";
      }
      textEl.value = "";
      addMessages([d.message]);
    } catch (e) {
      errEl.textContent = t.err;
    }
    sendBtn.disabled = false;
    textEl.focus();
  }

  nameEl.placeholder = t.name;
  textEl.placeholder = t.ph;
  sendBtn.textContent = t.send;
  sendBtn.onclick = send;
  textEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  });

  intro();
  if (token) nameEl.style.display = "none";
  poll();
  timer = setInterval(poll, 5000);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") poll(); });
})();

import { $, esc, t, getLang, T, api, token, toast, errMsg, mountHeader, fmtTime } from './common.js';

async function main() {
  await mountHeader();
  const L = T[getLang()];
  if (!(await token())) {
    location.replace('login.html?next=chat.html');
    return;
  }

  $('#app').innerHTML = `<section class="panel chat-box">
      <div id="log" class="log"></div>
      <form id="cf" class="reply">
        <textarea name="message" maxlength="2000" required placeholder="${L.chatPlaceholder}"></textarea>
        <button class="btn" type="submit">${L.send}</button>
      </form>
    </section>`;

  const load = async () => {
    try {
      const msgs = await api('/me/chat', { token: await token() });
      const log = $('#log');
      const atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 80;
      log.innerHTML = msgs.length
        ? msgs.map((m) => `<div class="bub ${m.sender_role === 'customer' ? 'out' : ''}">${esc(m.message)}
            <small>${fmtTime(m.created_at)}</small></div>`).join('')
        : `<p class="muted">${L.chatEmpty}</p>`;
      if (atBottom) log.scrollTop = log.scrollHeight;
    } catch (e) {
      toast(errMsg(e), false);
    }
  };

  await load();
  setInterval(load, 10000);

  $('#cf').addEventListener('submit', async (e) => {
    e.preventDefault();
    const ta = e.target.message;
    const text = ta.value.trim();
    if (!text) return;
    try {
      await api('/me/chat', { method: 'POST', token: await token(), json: { message: text } });
      ta.value = '';
      await load();
    } catch (err) {
      toast(errMsg(err), false);
    }
  });
}

main();

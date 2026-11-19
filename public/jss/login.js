import { $, t, getLang, T, api, sb, token, mountHeader, safeNext } from './common.js';

async function main() {
  await mountHeader();
  const params = new URLSearchParams(location.search);
  const next = safeNext(params.get('next'));
  const L = T[getLang()];
  const root = $('#app');
  const isReset = params.get('reset') === '1';

  let client;
  try {
    client = await sb();
  } catch {
    root.innerHTML = `<div class="panel narrow"><p>${t('loadError')}</p></div>`;
    return;
  }

  // Artıq daxil olubsa və parol bərpası deyilsə, birbaşa yönləndir
  if (!isReset && (await token())) {
    location.replace(next);
    return;
  }

  let mode = isReset ? 'newpass' : 'login';
  const FORMS = {
    login: `<label>${L.email}<input name="email" type="email" required autocomplete="username"></label>
      <label>${L.password}<input name="password" type="password" required autocomplete="current-password"></label>
      <button class="btn" type="submit">${L.login}</button>`,
    register: `<label>${L.fullName}<input name="full_name" maxlength="80"></label>
      <label>${L.email}<input name="email" type="email" required autocomplete="username"></label>
      <label>${L.password}<input name="password" type="password" minlength="8" required autocomplete="new-password"></label>
      <button class="btn" type="submit">${L.register}</button>`,
    reset: `<label>${L.email}<input name="email" type="email" required></label>
      <button class="btn" type="submit">${L.sendReset}</button>`,
    newpass: `<label>${L.newPassword}<input name="password" type="password" minlength="8" required autocomplete="new-password"></label>
      <button class="btn" type="submit">${L.save}</button>`,
  };

  const draw = () => {
    root.innerHTML = `<div class="panel narrow">
      ${mode === 'newpass' ? '' : `<div class="tabs">
        <button type="button" data-m="login" class="${mode === 'login' ? 'on' : ''}">${L.login}</button>
        <button type="button" data-m="register" class="${mode === 'register' ? 'on' : ''}">${L.register}</button>
        <button type="button" data-m="reset" class="${mode === 'reset' ? 'on' : ''}">${L.reset}</button></div>`}
      <form id="f" class="form">${FORMS[mode]}</form>
      <p id="msg" class="muted"></p></div>`;
    root.querySelectorAll('[data-m]').forEach((b) => b.addEventListener('click', () => { mode = b.dataset.m; draw(); }));
    $('#f').addEventListener('submit', (e) => { e.preventDefault(); handle(new FormData(e.target)); });
  };

  async function afterLogin() {
    try { await api('/me/sync', { method: 'POST', token: await token() }); } catch {}
    location.href = next;
  }

  async function handle(fd) {
    const msg = $('#msg');
    msg.textContent = '';
    try {
      if (mode === 'login') {
        const { error } = await client.auth.signInWithPassword({ email: fd.get('email'), password: fd.get('password') });
        if (error) throw new Error(L.invalidCreds);
        await afterLogin();
      } else if (mode === 'register') {
        const { data, error } = await client.auth.signUp({
          email: fd.get('email'),
          password: fd.get('password'),
          options: {
            data: { full_name: fd.get('full_name') || '' },
            emailRedirectTo: `${location.origin}/login.html`,
          },
        });
        if (error) throw error;
        if (data.session) return afterLogin();
        msg.textContent = L.signupOk;
      } else if (mode === 'reset') {
        const { error } = await client.auth.resetPasswordForEmail(fd.get('email'), {
          redirectTo: `${location.origin}/login.html?reset=1`,
        });
        if (error) throw error;
        msg.textContent = L.resetOk;
      } else if (mode === 'newpass') {
        const { error } = await client.auth.updateUser({ password: fd.get('password') });
        if (error) throw error;
        msg.textContent = L.passwordChanged;
        setTimeout(() => { location.href = 'profile.html'; }, 1200);
      }
    } catch (err) {
      msg.textContent = err.message || L.err.generic;
    }
  }

  draw();
}

main();

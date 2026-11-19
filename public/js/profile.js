import { $, esc, money, t, getLang, T, api, token, toast, errMsg, mountHeader, fmtDate, monthsLabel } from './common.js';

async function main() {
  await mountHeader();
  const L = T[getLang()];
  const tk = await token();
  if (!tk) {
    location.replace('login.html?next=profile.html');
    return;
  }

  let profile, orders;
  try {
    [profile, orders] = await Promise.all([
      api('/me/profile', { token: tk }),
      api('/orders/mine', { token: tk }),
    ]);
  } catch (e) {
    $('#app').innerHTML = `<div class="panel"><p>${errMsg(e)}</p></div>`;
    return;
  }

  const orderRow = (o) => `<div class="row-item">
      <div><b>${fmtDate(o.created_at)}</b>
        <div class="muted small">${(o.items || []).map((i) => `${esc(i.name)} · ${monthsLabel(i.months)} × ${i.quantity}`).join('<br>')}</div></div>
      <div class="right"><b>${money(o.total)}</b><span class="pill">${esc(L.status[o.status] || o.status)}</span></div>
    </div>`;

  $('#app').innerHTML = `
    <div class="grid2">
      <section class="panel">
        <h2>${L.profile}</h2>
        <form id="pf" class="form">
          <label>${L.email}<input value="${esc(profile.email || '')}" disabled></label>
          <label>${L.fullName}<input name="full_name" maxlength="80" value="${esc(profile.full_name || '')}"></label>
          <button class="btn" type="submit">${L.save}</button>
        </form>
        <button class="link" id="out" type="button">${L.logout}</button>
      </section>
      <section class="panel">
        <h2>${L.orders}</h2>
        ${orders.length ? orders.map(orderRow).join('') : `<p class="muted">${L.noOrders}</p>`}
      </section>
    </div>
    <section class="panel">
      <h2>${L.reviewTitle}</h2>
      <form id="rf" class="form">
        <label>${L.name}<input name="author_name" maxlength="60" required value="${esc(profile.full_name || '')}"></label>
        <label>${L.rating}<select name="rating">${[5, 4, 3, 2, 1].map((n) => `<option value="${n}">${'★'.repeat(n)}</option>`).join('')}</select></label>
        <label>${L.reviewText}<textarea name="text" minlength="10" maxlength="1000" required></textarea></label>
        <button class="btn" type="submit">${L.send}</button>
      </form>
    </section>
    <section class="panel"><a class="btn" href="chat.html">${L.chat}</a></section>`;

  $('#pf').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api('/me/profile', { method: 'PUT', token: await token(), json: { full_name: new FormData(e.target).get('full_name') } });
      toast(L.profileSaved);
    } catch (err) { toast(errMsg(err), false); }
  });

  $('#rf').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api('/public/reviews', {
        method: 'POST',
        token: await token(),
        json: { author_name: fd.get('author_name'), rating: Number(fd.get('rating')), text: fd.get('text'), lang: getLang() },
      });
      e.target.reset();
      toast(L.reviewOk);
    } catch (err) { toast(errMsg(err), false); }
  });

  $('#out').addEventListener('click', async () => {
    const { sb } = await import('./common.js');
    const client = await sb();
    await client.auth.signOut();
    location.href = 'index.html';
  });
}

main();

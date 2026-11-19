import { $, esc, money, t, getLang, api, token, toast, catalog, errMsg, mountHeader, monthsLabel } from './common.js';

async function main() {
  await mountHeader();
  const root = $('#app');
  const key = new URLSearchParams(location.search).get('product');
  try {
    const cat = await catalog();
    const p = cat.products.find((x) => x.key === key);
    if (!p) {
      root.innerHTML = `<div class="panel"><p>${t('notFound')}</p><a class="btn" href="index.html">${t('back')}</a></div>`;
      return;
    }
    render(root, p, cat);
  } catch {
    root.innerHTML = `<div class="panel"><p>${t('loadError')}</p></div>`;
  }
}

function render(root, p, cat) {
  const faqs = cat.faqs.filter((f) => f.product_key === p.key);
  const plans = p.prices.map((x, i) => `
    <label class="plan">
      <input type="radio" name="plan" value="${x.months}" ${i === 0 ? 'checked' : ''}>
      <span>${monthsLabel(x.months)}</span>
      <b>${x.sale_price ? `<s class="muted">${money(x.price)}</s> <span class="ok">${money(x.sale_price)}</span>` : money(x.price)}</b>
    </label>`).join('');

  root.innerHTML = `
    <div class="product">
      <div class="thumb big">${p.image_url
        ? `<img src="${esc(p.image_url)}" alt="${esc(p.name)}">`
        : `<span class="mono">${esc((p.name || '?').charAt(0))}</span>`}</div>
      <div class="panel">
        <h1>${esc(p.name)}</h1>
        ${p.description ? `<p class="muted">${esc(p.description)}</p>` : ''}
        ${p.features.length ? `<ul class="feat">${p.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
        ${p.prices.length ? `
          <form id="buy" class="form">
            <fieldset class="plans"><legend>${t('selectPlan')}</legend>${plans}</fieldset>
            <label>${t('qty')}<input type="number" id="qty" min="1" max="10" value="1"></label>
            <button class="btn" type="submit">${t('buy')}</button>
          </form>` : `<div class="notice">${t('contactPrice')}</div>`}
        <a class="link" href="chat.html">${t('askQuestion')} →</a>
      </div>
    </div>
    ${faqs.length ? `<section class="panel"><h2>${t('faq')}</h2>${faqs.map((f) =>
      `<details><summary>${esc(f.question)}</summary><p>${esc(f.answer)}</p></details>`).join('')}</section>` : ''}`;

  $('#buy')?.addEventListener('submit', (e) => order(e, p));
}

async function order(e, p) {
  e.preventDefault();
  const tk = await token();
  if (!tk) {
    location.href = `login.html?next=${encodeURIComponent(`product.html?product=${p.key}`)}`;
    return;
  }
  const months = Number(document.querySelector('input[name="plan"]:checked')?.value);
  const quantity = Number($('#qty').value) || 1;
  try {
    const o = await api('/orders', {
      method: 'POST',
      token: tk,
      json: { lang: getLang(), items: [{ product_key: p.key, months, quantity }] },
    });
    toast(`${t('orderOk')} · ${money(o.total)}`);
    setTimeout(() => { location.href = 'profile.html'; }, 1200);
  } catch (err) {
    toast(errMsg(err), false);
  }
}

main();

import { $, esc, t, catalog, mountHeader } from './common.js';

async function main() {
  await mountHeader();
  try {
    const cat = await catalog();
    const names = Object.fromEntries(cat.products.map((p) => [p.key, p.name]));
    $('#app').innerHTML = `<section class="panel"><h1>${t('faq')}</h1>
      ${cat.faqs.length ? cat.faqs.map((f) => `<details>
          <summary>${esc(f.question)}${f.product_key && names[f.product_key] ? ` <span class="muted small">· ${esc(names[f.product_key])}</span>` : ''}</summary>
          <p>${esc(f.answer)}</p></details>`).join('') : `<p class="muted">—</p>`}
      </section>`;
  } catch {
    $('#app').innerHTML = `<div class="panel"><p>${t('loadError')}</p></div>`;
  }
}

main();

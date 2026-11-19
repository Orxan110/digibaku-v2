import { $, esc, money, t, catalog, mountHeader, monthsLabel } from './common.js';

async function main() {
  await mountHeader();
  try {
    const cat = await catalog();
    const rows = cat.products.map((p) => {
      if (!p.prices.length) {
        return `<tr><td>${esc(p.name)}</td><td colspan="2" class="muted">${t('contactPrice')}</td></tr>`;
      }
      return p.prices.map((x, i) => `<tr>
          <td>${i === 0 ? `<a href="product.html?product=${encodeURIComponent(p.key)}">${esc(p.name)}</a>` : ''}</td>
          <td>${monthsLabel(x.months)}</td>
          <td>${x.sale_price ? `<s class="muted">${money(x.price)}</s> <span class="ok">${money(x.sale_price)}</span>` : money(x.price)}</td>
        </tr>`).join('');
    }).join('');
    $('#app').innerHTML = `<section class="panel"><h1>${t('prices')}</h1>
      <div class="tbl-wrap"><table class="tbl"><tbody>${rows}</tbody></table></div></section>`;
  } catch {
    $('#app').innerHTML = `<div class="panel"><p>${t('loadError')}</p></div>`;
  }
}

main();

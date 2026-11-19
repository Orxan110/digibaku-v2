import { $, esc, t, mountHeader } from './common.js';


async function main() {
try {
await mountHeader();


const response = await fetch('/api/public/catalog?lang=az');
if (!response.ok) throw new Error('API error');

const cat = await response.json();
const products = cat.products || [];
const faqs = cat.faqs || [];

const names = Object.fromEntries(
  products.map(p => [p.key, p.name])
);

$('#app').innerHTML = `
  <section class="panel">
    <h1>${t('faq')}</h1>
    ${
      faqs.length
        ? faqs.map(f => `
            <details>
              <summary>
                ${esc(f.question)}
                ${f.product_key && names[f.product_key]
                  ? `<span class="muted small"> · ${esc(names[f.product_key])}</span>`
                  : ''}
              </summary>
              <p>${esc(f.answer)}</p>
            </details>
          `).join('')
        : '<p class="muted">Hazırda tez-tez verilən suallar əlavə edilməyib.</p>'
    }
  </section>
`;



} catch (error) {
console.error('FAQ error:', error);
$('#app').innerHTML = <div class="panel"> <p>${t('loadError')}</p> <button class="chip chip-solid" onclick="location.reload()">Yenidən yoxla</button> </div>;
}
}


main();



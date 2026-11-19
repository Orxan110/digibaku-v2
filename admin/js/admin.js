/*
 * DigiBaku İdarəetmə Paneli.
 * - Bütün məlumat yalnız /api/admin marşrutları ilə gəlir/gedir (server icazə yoxlayır).
 * - Sessiya brauzer yaddaşında (localStorage) SAXLANMIR — yalnız yaddaşda (persistSession: false).
 * - Supabase yalnız giriş/çıxış/şifrə bərpası üçündür.
 */

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const fmt = (d) => (d ? new Date(d).toLocaleString('az-AZ', { dateStyle: 'short', timeStyle: 'short' }) : '—');
const money = (v) => `${Number(v || 0).toFixed(2)} AZN`;
const MONTHS = [1, 2, 3, 6, 12];
const STATUSES = ['pending', 'confirmed', 'processing', 'completed', 'cancelled'];
const STATUS_AZ = { pending: 'Cavab gözləyir', confirmed: 'Təsdiqləndi', processing: 'Hazırlanır', completed: 'Hazırdır', cancelled: 'Ləğv edildi' };

const ERRORS = {
  unauthorized: 'Sessiya bitib. Yenidən daxil olun.',
  forbidden: 'Bu əməliyyat üçün icazəniz yoxdur.',
  invalid_price: 'Qiymət düzgün deyil (müsbət rəqəm olmalıdır).',
  invalid_sale: 'Endirimli qiymət əsas qiymətdən kiçik olmalıdır.',
  invalid_url: 'Şəkil/keçid ünvanı http(s):// ilə və ya / ilə başlamalıdır.',
  invalid_image: 'Yalnız WebP, PNG, JPG və ya AVIF şəkli (5 MB-a qədər).',
  invalid_status: 'Status düzgün deyil.',
  product_key_required: 'Məhsul açarı (product_key) daxil edin.',
  nothing_to_update: 'Dəyişiklik yoxdur.',
  not_found: 'Tapılmadı.',
  too_long: 'Mətn çox uzundur.',
  invalid_message: 'Mesaj boş və ya çox uzundur.',
  invalid_content: 'Mətn açarı və ya dil düzgün deyil.',
  generic: 'Xəta baş verdi. Yenidən cəhd edin.',
};

const S = { sb: null, me: null, section: 'dashboard', pollTimer: null, thread: null, rows: [] };

/* ---------- bildiriş ---------- */
let toastTimer;
function toast(msg, type = 'ok') {
  const el = $('#toast');
  el.textContent = msg;
  el.className = `toast show ${type === 'err' ? 'err' : 'ok'}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

/* ---------- API ---------- */
async function accessToken() {
  const { data } = await S.sb.auth.getSession();
  return data.session?.access_token || '';
}

async function api(path, { method = 'GET', json, body, headers = {} } = {}) {
  const h = { Authorization: `Bearer ${await accessToken()}`, ...headers };
  let payload = body;
  if (json !== undefined) { h['Content-Type'] = 'application/json'; payload = JSON.stringify(json); }
  const res = await fetch(`/api/admin${path}`, { method, headers: h, body: payload });
  if (res.status === 204) return null;
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    const code = data?.error || 'generic';
    if (res.status === 401) { await logout(); }
    const err = new Error(ERRORS[code] || data?.error || ERRORS.generic);
    err.code = code;
    throw err;
  }
  return data;
}

/* ---------- giriş ---------- */
async function boot() {
  const cfg = await (await fetch('/api/public/config')).json();
  if (!cfg.supabaseAnonKey) console.warn('SUPABASE_ANON_KEY təyin edilməyib.');
  S.sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey || 'missing', {
    auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false },
  });
  const { data } = await S.sb.auth.getSession();
  if (data.session) await enter(); else showLogin();
}

function showLogin(msg = '') {
  $('#appView').hidden = true;
  $('#loginView').hidden = false;
  $('#loginMsg').textContent = msg;
}

$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#loginMsg').textContent = '';
  const { error } = await S.sb.auth.signInWithPassword({
    email: $('#lEmail').value.trim(),
    password: $('#lPass').value,
  });
  if (error) return showLogin('E-poçt və ya şifrə yanlışdır.');
  await enter();
});

$('#forgot').addEventListener('click', async () => {
  const email = $('#lEmail').value.trim();
  if (!email) return showLogin('Əvvəlcə e-poçtunuzu yazın.');
  await S.sb.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/gizli_panel.html` });
  showLogin('Şifrə bərpa linki e-poçtunuza göndərildi (əgər hesab mövcuddursa).');
});

async function enter() {
  try {
    S.me = await api('/me');
  } catch (e) {
    await S.sb.auth.signOut();
    return showLogin(e.code === 'forbidden' ? 'Bu hesabın admin icazəsi yoxdur.' : ERRORS.unauthorized);
  }
  $('#loginView').hidden = true;
  $('#appView').hidden = false;
  $('#whoami').textContent = `${S.me.email} · ${S.me.role}`;
  buildNav();
  go('dashboard');
}

async function logout() {
  stopPoll();
  if (S.sb) await S.sb.auth.signOut();
  S.me = null;
  showLogin();
}
$('#logout').addEventListener('click', logout);

/* ---------- navigasiya ---------- */
const SECTIONS = [
  ['dashboard', 'Dashboard'], ['orders', 'Sifarişlər'], ['products', 'Məhsullar'],
  ['categories', 'Kateqoriyalar'], ['banners', 'Bannerlər'], ['reviews', 'Rəylər'],
  ['faqs', 'FAQ'], ['content', 'Mətnlər və tərcümə'], ['messages', 'Mesajlar'],
  ['customers', 'Müştərilər'], ['settings', 'Sayt ayarları'],
];

function buildNav() {
  $('#nav').innerHTML = SECTIONS.map(([k, label]) =>
    `<button data-s="${k}">${esc(label)}</button>`).join('');
  $('#nav').onclick = (e) => { const b = e.target.closest('[data-s]'); if (b) go(b.dataset.s); };
}

function go(section) {
  S.section = section;
  stopPoll();
  document.querySelectorAll('#nav [data-s]').forEach((b) => b.classList.toggle('on', b.dataset.s === section));
  $('#title').textContent = SECTIONS.find((s) => s[0] === section)?.[1] || '';
  $('#headActions').innerHTML = '';
  const map = {
    dashboard: renderDashboard, orders: renderOrders, products: renderProducts,
    categories: () => renderEntity('categories'), banners: () => renderEntity('banners'),
    reviews: () => renderEntity('reviews'), faqs: () => renderEntity('faqs'),
    content: renderContent, messages: renderMessages, customers: renderCustomers, settings: renderSettings,
  };
  $('#view').innerHTML = '<p class="muted">Yüklənir…</p>';
  Promise.resolve(map[section]()).catch((e) => {
    $('#view').innerHTML = `<p class="pill bad">${esc(e.message)}</p>`;
  });
}

function table(headers, rows, empty = 'Məlumat yoxdur') {
  return `<div class="tbl-wrap"><table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${rows.length ? rows.join('') : `<tr><td colspan="${headers.length}" class="muted">${empty}</td></tr>`}</tbody></table></div>`;
}

/** Cədvəldə axtarış: data-filter olan inputa yazıldıqca sətirləri süzür */
function wireFilter(root) {
  const input = root.querySelector('[data-filter]');
  if (!input) return;
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase();
    root.querySelectorAll('tbody tr[data-search]').forEach((tr) => {
      tr.hidden = q && !tr.dataset.search.includes(q);
    });
  });
}

/* ---------- modal ---------- */
function modal(title, bodyHtml, { onSave, saveText = 'Yadda saxla', danger } = {}) {
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<div class="modal" role="dialog" aria-modal="true">
    <header><strong>${esc(title)}</strong><button class="btn ghost sm" data-x>✕</button></header>
    <div class="body">${bodyHtml}</div>
    <footer>${onSave ? `<button class="btn ghost" data-x>Ləğv et</button><button class="btn ${danger ? 'danger' : ''}" data-save>${esc(saveText)}</button>` : '<button class="btn ghost" data-x>Bağla</button>'}</footer>
  </div>`;
  document.body.appendChild(ov);
  const close = () => ov.remove();
  ov.addEventListener('click', (e) => { if (e.target === ov || e.target.closest('[data-x]')) close(); });
  if (onSave) {
    ov.querySelector('[data-save]').addEventListener('click', async (e) => {
      e.currentTarget.disabled = true;
      try { await onSave(ov); close(); } catch (err) { toast(err.message, 'err'); e.currentTarget.disabled = false; }
    });
  }
  // şəkil yükləmə sahələri
  ov.querySelectorAll('[data-upload]').forEach((inp) => inp.addEventListener('change', async () => {
    const file = inp.files[0];
    if (!file) return;
    try {
      const url = await uploadImage(file, inp.dataset.folder || 'misc');
      const target = ov.querySelector(`[data-k="${inp.dataset.upload}"]`);
      target.value = url;
      target.dispatchEvent(new Event('input'));
      toast('Şəkil yükləndi.');
    } catch (err) { toast(err.message, 'err'); }
    inp.value = '';
  }));
  ov.querySelectorAll('[data-k][data-preview]').forEach((inp) => {
    const prev = ov.querySelector(`#prev-${inp.dataset.k}`);
    const paint = () => { prev.innerHTML = inp.value ? `<img src="${esc(inp.value)}" alt="">` : '<span class="muted small">Önizləmə</span>'; };
    inp.addEventListener('input', paint); paint();
  });
  return ov;
}

const collect = (root) => {
  const out = {};
  root.querySelectorAll('[data-k]').forEach((el) => {
    const k = el.dataset.k;
    if (el.type === 'checkbox') out[k] = el.checked;
    else if (el.type === 'number') out[k] = el.value === '' ? null : Number(el.value);
    else out[k] = el.value.trim() === '' ? null : el.value.trim();
  });
  return out;
};

async function uploadImage(file, folder) {
  const res = await fetch(`/api/admin/upload?folder=${encodeURIComponent(folder)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': file.type },
    body: file,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(ERRORS[data.error] || ERRORS.generic);
  return data.url;
}

const confirmDo = (text) => window.confirm(text);

/* ---------- Dashboard ---------- */
async function renderDashboard() {
  const s = await api('/stats');
  const stat = (label, val) => `<div class="stat"><span class="muted small">${label}</span><b>${val}</b></div>`;
  $('#view').innerHTML = `
    <div class="stats">
      ${stat('Ümumi sifariş', s.orders_total)}
      ${stat('Yeni (gözləyən)', s.new_orders)}
      ${stat('Tamamlanmış gəlir', money(s.revenue_completed))}
      ${stat('Müştəri sayı', s.customers)}
      ${stat('Oxunmamış mesaj', s.new_messages)}
      ${stat('Gözləyən rəy', s.pending_reviews)}
    </div>
    <div class="grid2">
      <div class="card"><h3>Ən çox satılan məhsullar</h3>
        ${table(['Məhsul', 'Say', 'Gəlir'], s.top_products.map((p) =>
          `<tr><td>${esc(p.name || p.product_key)}</td><td>${p.quantity}</td><td>${money(p.revenue)}</td></tr>`))}
      </div>
      <div class="card"><h3>Son günlər</h3>
        ${table(['Tarix', 'Sifariş', 'Gəlir'], s.daily.map((d) =>
          `<tr><td>${esc(d.date)}</td><td>${d.orders}</td><td>${money(d.revenue)}</td></tr>`))}
      </div>
    </div>
    <p class="muted small" style="margin-top:14px">Statuslar: ${STATUSES.map((k) => `${STATUS_AZ[k]}: ${s.orders_by_status[k] ?? 0}`).join(' · ')}</p>`;
}

/* ---------- Sifarişlər ---------- */
async function renderOrders() {
  $('#headActions').innerHTML = `<select id="stF" style="width:auto"><option value="">Bütün statuslar</option>${STATUSES.map((s) => `<option value="${s}">${STATUS_AZ[s]}</option>`).join('')}</select>`;
  const rows = await api(`/orders${$('#stF')?.value ? `?status=${$('#stF').value}` : ''}`);
  const draw = (list) => table(['Tarix', 'Müştəri', 'Məhsullar', 'Məbləğ', 'Status'], list.map((o) => `<tr>
      <td>${fmt(o.created_at)}</td>
      <td class="small muted">${esc(String(o.user_id || '').slice(0, 8))}</td>
      <td>${(o.items || []).map((i) => `${esc(i.name)} (${i.months}${i.months === 12 ? ' il' : ' ay'}×${i.quantity})`).join('<br>') || '—'}</td>
      <td>${money(o.total)}</td>
      <td><select data-order="${esc(o.id)}" style="width:auto">${STATUSES.map((s) => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${STATUS_AZ[s]}</option>`).join('')}</select></td>
    </tr>`), 'Sifariş yoxdur');
  $('#view').innerHTML = draw(rows);
  $('#stF').addEventListener('change', renderOrders);
  $('#view').querySelectorAll('[data-order]').forEach((sel) => sel.addEventListener('change', async () => {
    try {
      await api(`/orders/${sel.dataset.order}/status`, { method: 'PATCH', json: { status: sel.value } });
      toast('Status yeniləndi.');
    } catch (e) { toast(e.message, 'err'); renderOrders(); }
  }));
}

/* ---------- Məhsullar ---------- */
const PRODUCT_TEXT = [
  ['name_az', 'Ad (AZ) *', 'text'], ['name_ru', 'Ad (RU)', 'text'], ['name_en', 'Ad (EN)', 'text'],
  ['slug', 'Slug / URL', 'text'],
];

async function renderProducts() {
  $('#headActions').innerHTML = `<button class="btn" id="newP">+ Yeni məhsul</button>`;
  $('#newP').addEventListener('click', () => openProductForm(null));
  const [list, cats] = await Promise.all([api('/products'), api('/categories')]);
  S.rows = list; S.cats = cats;
  $('#view').innerHTML = `<div class="toolbar"><input data-filter type="search" placeholder="Məhsul axtar…"></div>
    ${table(['', 'Ad', 'Açar', 'Kateqoriya', 'Qiymətlər', 'Aktiv', ''], list.map((p) => {
      const prices = MONTHS.filter((m) => p.prices?.[`price_${m}_month`] > 0).map((m) => {
        const base = p.prices[`price_${m}_month`];
        const sale = p.prices[`sale_${m}_active`] && p.prices[`sale_${m}_price`] < base ? p.prices[`sale_${m}_price`] : null;
        return `${m === 12 ? '1 il' : m + ' ay'}: ${sale ? `<s class="muted">${base}</s> ${sale}` : base} AZN`;
      }).join('<br>') || '<span class="pill warn">Qiymət yoxdur</span>';
      return `<tr data-search="${esc((p.name_az + ' ' + p.product_key).toLowerCase())}">
        <td>${p.image_url ? `<img class="thumb-s" src="${esc(p.image_url)}" alt="">` : '<span class="thumb-s"></span>'}</td>
        <td>${esc(p.name_az || p.name)}</td>
        <td class="small muted">${esc(p.product_key)}</td>
        <td>${esc(cats.find((c) => c.key === p.category_key)?.name_az || p.category_key || '—')}</td>
        <td class="small">${prices}</td>
        <td><span class="pill ${p.active ? 'ok' : 'bad'}">${p.active ? 'Aktiv' : 'Deaktiv'}</span></td>
        <td><div class="actions">
          <button class="btn ghost sm" data-edit="${esc(p.product_key)}">Redaktə</button>
          <button class="btn ghost sm" data-del="${esc(p.product_key)}">Deaktiv et</button>
          <button class="btn danger sm" data-hard="${esc(p.product_key)}">Tamamilə sil</button></div></td></tr>`;
    }), 'Məhsul yoxdur')}`;
  wireFilter($('#view'));
  $('#view').onclick = (e) => {
    const ed = e.target.closest('[data-edit]');
    const off = e.target.closest('[data-del]');
    const hard = e.target.closest('[data-hard]');
    if (ed) openProductForm(list.find((p) => p.product_key === ed.dataset.edit));
    if (off) deleteProduct(off.dataset.del, false);
    if (hard) deleteProduct(hard.dataset.hard, true);
  };
}

async function deleteProduct(key, hard) {
  const msg = hard
    ? `"${key}" və onun qiymətləri TAMAMİLƏ silinsin? Bu geri qaytarıla bilməz.`
    : `"${key}" məhsulu saytda gizlədilsin? (Məlumat qalır, sonra yenidən aktiv edə bilərsiniz.)`;
  if (!confirmDo(msg)) return;
  try {
    await api(`/products/${encodeURIComponent(key)}${hard ? '?hard=1' : ''}`, { method: 'DELETE' });
    toast(hard ? 'Məhsul tamamilə silindi.' : 'Məhsul deaktiv edildi.');
    renderProducts();
  } catch (e) { toast(e.message, 'err'); }
}

function openProductForm(p) {
  const isNew = !p;
  const v = p || { active: true, sort_order: 0, is_featured: false, prices: {} };
  const catOpts = (S.cats || []).map((c) => `<option value="${esc(c.key)}" ${c.key === v.category_key ? 'selected' : ''}>${esc(c.name_az)}</option>`).join('');
  const feats = (k) => (Array.isArray(v[k]) ? v[k].join('\n') : '');
  const priceRows = MONTHS.map((m) => {
    const r = v.prices || {};
    const price = r[`price_${m}_month`] ?? '';
    const sale = r[`sale_${m}_price`] ?? '';
    const on = !!r[`sale_${m}_active`];
    return `<span class="small muted">${m === 12 ? '1 il' : m + ' ay'}</span>
      <input type="number" step="0.01" min="0" data-price="${m}" data-f="price" value="${esc(price)}" placeholder="Qiymət">
      <input type="number" step="0.01" min="0" data-price="${m}" data-f="sale_price" value="${esc(sale)}" placeholder="Endirimli">
      <label class="chk small"><input type="checkbox" data-price="${m}" data-f="sale_active" ${on ? 'checked' : ''}> endirim</label>`;
  }).join('');

  const body = `
    <div class="form-grid">
      ${isNew ? `<label class="full">Məhsul açarı (product_key) *<input data-k="product_key" placeholder="məs: netflix_premium"></label>` : ''}
      ${PRODUCT_TEXT.map(([k, l, t]) => `<label>${esc(l)}<input data-k="${k}" type="${t}" value="${esc(v[k] ?? (k === 'name_az' ? v.name : '') ?? '')}"></label>`).join('')}
      <label>Kateqoriya<select data-k="category_key"><option value="">— seçilməyib —</option>${catOpts}</select></label>
      <label>Sıra<input data-k="sort_order" type="number" value="${v.sort_order ?? 0}"></label>
      <label class="full">Təsvir (AZ)<textarea data-k="description_az">${esc(v.description_az)}</textarea></label>
      <label class="full">Təsvir (RU)<textarea data-k="description_ru">${esc(v.description_ru)}</textarea></label>
      <label class="full">Təsvir (EN)<textarea data-k="description_en">${esc(v.description_en)}</textarea></label>
      <label>Üstünlüklər (AZ) — hər sətir bir maddə<textarea data-k="features_az">${esc(feats('features_az'))}</textarea></label>
      <label>Üstünlüklər (RU)<textarea data-k="features_ru">${esc(feats('features_ru'))}</textarea></label>
      <label class="full">Üstünlüklər (EN)<textarea data-k="features_en">${esc(feats('features_en'))}</textarea></label>
      <div class="full img-field">
        <div class="img-prev" id="prev-image_url"></div>
        <div class="row">
          <label>Şəkil URL-i<input data-k="image_url" data-preview value="${esc(v.image_url)}" placeholder="/assets/img/… və ya https://…"></label>
          <label>və ya şəkil yüklə (WebP/PNG/JPG/AVIF, 5 MB)<input type="file" accept="image/*" data-upload="image_url" data-folder="products"></label>
        </div>
      </div>
      <div class="full"><div class="prices-grid">
        <span class="h">Müddət</span><span class="h">Qiymət (AZN)</span><span class="h">Endirimli</span><span class="h">Aktiv</span>
        ${priceRows}
      </div><p class="muted small">Qiyməti boş buraxsanız həmin müddət saytda göstərilmir (0 AZN heç vaxt göstərilmir).</p></div>
      <label class="chk full"><input type="checkbox" data-k="is_featured" ${v.is_featured ? 'checked' : ''}> Böyük kart (önə çıxarılmış)</label>
      <label class="chk full"><input type="checkbox" data-k="active" ${v.active ? 'checked' : ''}> Saytda aktiv</label>
      <label class="full">SEO (JSON: {"title":"…","description":"…"})<textarea data-k="seo">${esc(JSON.stringify(v.seo || {}, null, 0))}</textarea></label>
    </div>`;

  modal(isNew ? 'Yeni məhsul' : `Redaktə: ${v.name_az || v.name}`, body, {
    onSave: async (ov) => {
      const d = collect(ov);
      if (isNew && !d.product_key) throw new Error(ERRORS.product_key_required);
      if (!d.name_az) throw new Error('Ad (AZ) mütləqdir.');
      let seo = {};
      if (d.seo) { try { seo = JSON.parse(d.seo); } catch { throw new Error('SEO JSON formatı düzgün deyil.'); } }
      const prices = {};
      for (const m of MONTHS) {
        const g = (f) => ov.querySelector(`[data-price="${m}"][data-f="${f}"]`);
        const price = g('price').value === '' ? null : Number(g('price').value);
        const sale = g('sale_price').value === '' ? null : Number(g('sale_price').value);
        prices[m] = { price, sale_price: sale, sale_active: g('sale_active').checked };
      }
      const body = {
        ...d,
        features_az: d.features_az ? d.features_az.split('\n') : [],
        features_ru: d.features_ru ? d.features_ru.split('\n') : [],
        features_en: d.features_en ? d.features_en.split('\n') : [],
        category_key: d.category_key || null,
        seo,
        prices,
      };
      if (isNew) {
        await api('/products', { method: 'POST', json: body });
        toast('Məhsul yaradıldı.');
      } else {
        delete body.product_key;
        await api(`/products/${encodeURIComponent(p.product_key)}`, { method: 'PUT', json: body });
        toast('Məhsul yadda saxlanıldı.');
      }
      renderProducts();
    },
  });
}

/* ---------- Ümumi CRUD: kateqoriya, banner, rəy, FAQ ---------- */
const ENTITIES = {
  categories: {
    title: 'Kateqoriya', api: 'categories', id: 'key', search: ['name_az', 'key'],
    cols: [['name_az', 'Ad (AZ)'], ['key', 'Açar'], ['icon', 'İkon'], ['sort_order', 'Sıra'], ['active', 'Aktiv']],
    fields: [
      { k: 'key', l: 'Açar (slug) *', t: 'text', req: true, createOnly: true },
      { k: 'name_az', l: 'Ad (AZ) *', t: 'text', req: true },
      { k: 'name_ru', l: 'Ad (RU)', t: 'text' }, { k: 'name_en', l: 'Ad (EN)', t: 'text' },
      { k: 'icon', l: 'İkon (emoji)', t: 'text' }, { k: 'sort_order', l: 'Sıra', t: 'number' },
      { k: 'active', l: 'Aktiv', t: 'bool' },
    ],
  },
  banners: {
    title: 'Banner', api: 'banners', search: ['title_az'],
    cols: [['title_az', 'Başlıq (AZ)'], ['cta_url', 'Keçid'], ['sort_order', 'Sıra'], ['active', 'Aktiv']],
    fields: [
      { k: 'title_az', l: 'Başlıq (AZ)', t: 'text' }, { k: 'title_ru', l: 'Başlıq (RU)', t: 'text' }, { k: 'title_en', l: 'Başlıq (EN)', t: 'text' },
      { k: 'subtitle_az', l: 'Alt başlıq (AZ)', t: 'textarea' }, { k: 'subtitle_ru', l: 'Alt başlıq (RU)', t: 'textarea' }, { k: 'subtitle_en', l: 'Alt başlıq (EN)', t: 'textarea' },
      { k: 'cta_label_az', l: 'Düymə (AZ)', t: 'text' }, { k: 'cta_label_ru', l: 'Düymə (RU)', t: 'text' }, { k: 'cta_label_en', l: 'Düymə (EN)', t: 'text' },
      { k: 'cta_url', l: 'Düymə keçidi', t: 'text' }, { k: 'image_url', l: 'Şəkil', t: 'image' },
      { k: 'sort_order', l: 'Sıra', t: 'number' }, { k: 'active', l: 'Aktiv', t: 'bool' },
    ],
  },
  reviews: {
    title: 'Rəy', api: 'reviews', search: ['author_name'],
    cols: [['author_name', 'Müəllif'], ['rating', 'Ulduz'], ['status', 'Status'], ['show_on_home', 'Ana səhifə'], ['sort_order', 'Sıra']],
    fields: [
      { k: 'author_name', l: 'Müəllif *', t: 'text', req: true }, { k: 'rating', l: 'Ulduz (1–5)', t: 'number' },
      { k: 'review_date', l: 'Tarix', t: 'date' }, { k: 'status', l: 'Status', t: 'select', opts: ['pending', 'approved', 'rejected'] },
      { k: 'show_on_home', l: 'Ana səhifədə göstər', t: 'bool' },
      { k: 'body_az', l: 'Mətn (AZ)', t: 'textarea' }, { k: 'body_ru', l: 'Mətn (RU)', t: 'textarea' }, { k: 'body_en', l: 'Mətn (EN)', t: 'textarea' },
      { k: 'sort_order', l: 'Sıra', t: 'number' },
    ],
  },
  faqs: {
    title: 'FAQ', api: 'faqs', search: ['question'],
    cols: [['question', 'Sual'], ['language', 'Dil'], ['product_key', 'Məhsul'], ['active', 'Aktiv'], ['sort_order', 'Sıra']],
    fields: [
      { k: 'language', l: 'Dil', t: 'select', opts: ['az', 'ru', 'en'] },
      { k: 'product_key', l: 'Məhsul açarı (boş = ümumi)', t: 'text' },
      { k: 'question', l: 'Sual *', t: 'textarea', req: true }, { k: 'answer', l: 'Cavab *', t: 'textarea', req: true },
      { k: 'sort_order', l: 'Sıra', t: 'number' }, { k: 'active', l: 'Aktiv', t: 'bool' },
    ],
  },
};

const fieldHtml = (f, v) => {
  const val = v?.[f.k] ?? '';
  const dis = f.createOnly && v ? 'disabled' : '';
  if (f.t === 'bool') return `<label class="chk full"><input type="checkbox" data-k="${f.k}" ${val ? 'checked' : ''}> ${esc(f.l)}</label>`;
  if (f.t === 'textarea') return `<label class="full">${esc(f.l)}<textarea data-k="${f.k}" ${dis}>${esc(val)}</textarea></label>`;
  if (f.t === 'select') return `<label>${esc(f.l)}<select data-k="${f.k}">${f.opts.map((o) => `<option ${o === val ? 'selected' : ''}>${o}</option>`).join('')}</select></label>`;
  if (f.t === 'image') return `<div class="full img-field"><div class="img-prev" id="prev-${f.k}"></div><div class="row">
      <label>${esc(f.l)}<input data-k="${f.k}" data-preview value="${esc(val)}"></label>
      <label>və ya yüklə<input type="file" accept="image/*" data-upload="${f.k}" data-folder="banners"></label></div></div>`;
  return `<label>${esc(f.l)}<input data-k="${f.k}" type="${f.t === 'number' ? 'number' : f.t === 'date' ? 'date' : 'text'}" value="${esc(val)}" ${dis}></label>`;
};

async function renderEntity(name) {
  const E = ENTITIES[name];
  $('#headActions').innerHTML = `<button class="btn" id="addE">+ Yeni ${E.title.toLowerCase()}</button>`;
  $('#addE').addEventListener('click', () => openEntity(name, null));
  const rows = await api(`/${E.api}`);
  S.rows = rows;
  const cell = (r, k) => {
    if (k === 'active' || k === 'show_on_home') return `<span class="pill ${r[k] ? 'ok' : 'bad'}">${r[k] ? 'Bəli' : 'Xeyr'}</span>`;
    if (k === 'status') return `<span class="pill ${r.status === 'approved' ? 'ok' : r.status === 'pending' ? 'warn' : 'bad'}">${esc(r.status)}</span>`;
    if (k === 'rating') return '★'.repeat(r.rating || 0);
    return esc(r[k] ?? '—');
  };
  $('#view').innerHTML = `<div class="toolbar"><input data-filter type="search" placeholder="Axtar…"></div>
    ${table([...E.cols.map((c) => c[1]), ''], rows.map((r) => {
      const id = r[E.id || 'id'];
      const search = E.search.map((k) => r[k] ?? '').join(' ').toLowerCase();
      return `<tr data-search="${esc(search)}">${E.cols.map(([k]) => `<td>${cell(r, k)}</td>`).join('')}
        <td><div class="actions"><button class="btn ghost sm" data-e="${esc(id)}">Redaktə</button>
        <button class="btn danger sm" data-d="${esc(id)}">Sil</button></div></td></tr>`;
    }), 'Məlumat yoxdur')}`;
  wireFilter($('#view'));
  $('#view').onclick = async (e) => {
    const ed = e.target.closest('[data-e]');
    const del = e.target.closest('[data-d]');
    if (ed) openEntity(name, rows.find((r) => String(r[E.id || 'id']) === ed.dataset.e));
    if (del) {
      if (!confirmDo(`Bu ${E.title.toLowerCase()} silinsin? Geri qaytarıla bilməz.`)) return;
      try { await api(`/${E.api}/${encodeURIComponent(del.dataset.d)}`, { method: 'DELETE' }); toast('Silindi.'); renderEntity(name); }
      catch (err) { toast(err.message, 'err'); }
    }
  };
}

function openEntity(name, row) {
  const E = ENTITIES[name];
  const idKey = E.id || 'id';
  const body = `<div class="form-grid">${E.fields.map((f) => fieldHtml(f, row)).join('')}</div>`;
  modal(row ? `Redaktə: ${E.title}` : `Yeni ${E.title}`, body, {
    onSave: async (ov) => {
      const d = collect(ov);
      for (const f of E.fields) if (f.req && !d[f.k]) throw new Error(`"${f.l.replace(' *', '')}" mütləqdir.`);
      if (row) {
        const { [idKey]: _omit, ...rest } = d;
        await api(`/${E.api}/${encodeURIComponent(row[idKey])}`, { method: 'PUT', json: rest });
      } else {
        await api(`/${E.api}`, { method: 'POST', json: d });
      }
      toast('Yadda saxlanıldı.');
      renderEntity(name);
    },
  });
}

/* ---------- Mətnlər və tərcümə ---------- */
const CONTENT_KEYS = [
  ['hero_title', 'Ana səhifə — başlıq'], ['hero_subtitle', 'Ana səhifə — alt başlıq'], ['hero_cta', 'Ana səhifə — düymə'],
  ['footer_text', 'Footer mətni'], ['about_text', 'Haqqımızda'], ['terms_text', 'Şərtlər və qaydalar'],
  ['privacy_text', 'Məxfilik siyasəti'], ['contact_text', 'Əlaqə mətni'],
];

async function renderContent() {
  $('#headActions').innerHTML = `<button class="btn" id="saveC">Hamısını yadda saxla</button>`;
  const rows = await api('/content');
  const map = {};
  for (const r of rows) (map[r.key] ??= {})[r.lang] = r.value;
  const extra = Object.keys(map).filter((k) => !CONTENT_KEYS.some(([c]) => c === k));
  const all = [...CONTENT_KEYS, ...extra.map((k) => [k, k])];
  $('#view').innerHTML = `<p class="muted small">Açar: sayt-da hansı yerdə göstərildiyini göstərir. Yeni açar əlavə etmək üçün aşağıdan daxil edin.</p>
    <div class="grid2" id="cgrid">${all.map(([k, label]) => `
      <div class="card" data-key="${esc(k)}"><h3>${esc(label)} <span class="muted small">(${esc(k)})</span></h3>
        ${['az', 'ru', 'en'].map((l) => `<label>${l.toUpperCase()}<textarea data-lang="${l}">${esc(map[k]?.[l] ?? '')}</textarea></label>`).join('')}
      </div>`).join('')}</div>
    <div class="card" style="margin-top:14px"><h3>Yeni açar</h3><div class="toolbar" style="margin:0">
      <input id="newKey" placeholder="məs: promo_banner_text (kiçik hərf, _ və ya -)"><button class="btn ghost" id="addKey">Əlavə et</button></div></div>`;
  $('#addKey').addEventListener('click', () => {
    const k = $('#newKey').value.trim().toLowerCase();
    if (!/^[a-z0-9_.-]{1,80}$/.test(k)) return toast('Açar yalnız kiçik hərf, rəqəm, _ . - ola bilər.', 'err');
    if ($('#cgrid').querySelector(`[data-key="${k}"]`)) return toast('Bu açar artıq var.', 'err');
    $('#cgrid').insertAdjacentHTML('beforeend', `<div class="card" data-key="${esc(k)}"><h3>${esc(k)}</h3>
      ${['az', 'ru', 'en'].map((l) => `<label>${l.toUpperCase()}<textarea data-lang="${l}"></textarea></label>`).join('')}</div>`);
    $('#newKey').value = '';
  });
  $('#saveC').addEventListener('click', async () => {
    const items = [];
    $('#cgrid').querySelectorAll('[data-key]').forEach((card) => {
      card.querySelectorAll('[data-lang]').forEach((ta) => items.push({ key: card.dataset.key, lang: ta.dataset.lang, value: ta.value }));
    });
    try { const r = await api('/content', { method: 'PUT', json: { items } }); toast(`${r.saved} sətir yadda saxlanıldı.`); }
    catch (e) { toast(e.message, 'err'); }
  });
}

/* ---------- Mesajlar (çat) ---------- */
function stopPoll() { clearInterval(S.pollTimer); S.pollTimer = null; }

async function renderMessages() {
  $('#view').innerHTML = `<div class="chat">
    <div class="threads" id="threads"><p class="muted" style="padding:12px">Yüklənir…</p></div>
    <div class="convo"><div class="bubbles" id="bubbles"><p class="muted">Söhbət seçin.</p></div>
      <div class="reply" id="replyBox" hidden><textarea id="replyTxt" placeholder="Cavab yazın…"></textarea><button class="btn" id="sendR">Göndər</button></div>
    </div></div>`;
  $('#sendR').addEventListener('click', sendReply);
  $('#replyTxt').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } });
  await loadThreads();
  S.pollTimer = setInterval(() => {
    if (S.section !== 'messages') return stopPoll();
    loadThreads(); if (S.thread) loadThread(S.thread, true);
  }, 15000);
}

async function loadThreads() {
  const list = await api('/threads');
  const box = $('#threads');
  if (!box) return;
  box.innerHTML = list.length ? list.map((t) => {
    const name = t.profile?.full_name || t.profile?.email || String(t.user_id).slice(0, 8);
    return `<button class="thread ${S.thread === t.user_id ? 'on' : ''}" data-u="${esc(t.user_id)}">
      <div class="t1"><span>${esc(name)}</span>${t.unread ? `<span class="badge">${t.unread}</span>` : ''}</div>
      <div class="t2">${t.last_sender === 'admin' ? 'Siz: ' : ''}${esc(t.last_message)}</div></button>`;
  }).join('') : '<p class="muted" style="padding:12px">Mesaj yoxdur.</p>';
  box.querySelectorAll('[data-u]').forEach((b) => b.addEventListener('click', () => {
    S.thread = b.dataset.u;
    loadThread(S.thread);
    loadThreads();
  }));
}

async function loadThread(userId, silent = false) {
  const msgs = await api(`/threads/${encodeURIComponent(userId)}`);
  const box = $('#bubbles');
  if (!box) return;
  const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
  box.innerHTML = msgs.map((m) => `<div class="bub ${m.sender_role === 'admin' ? 'admin' : ''}">${esc(m.message)}
    <small>${m.sender_role === 'admin' ? 'Siz' : 'Müştəri'} · ${fmt(m.created_at)}</small></div>`).join('') || '<p class="muted">Mesaj yoxdur.</p>';
  $('#replyBox').hidden = false;
  if (atBottom || !silent) box.scrollTop = box.scrollHeight;
  if (!silent) { try { await api(`/threads/${encodeURIComponent(userId)}/read`, { method: 'PATCH' }); loadThreads(); } catch {} }
}

async function sendReply() {
  const txt = $('#replyTxt');
  const message = txt.value.trim();
  if (!message || !S.thread) return;
  try {
    await api(`/threads/${encodeURIComponent(S.thread)}`, { method: 'POST', json: { message } });
    txt.value = '';
    loadThread(S.thread);
    loadThreads();
  } catch (e) { toast(e.message, 'err'); }
}

/* ---------- Müştərilər ---------- */
async function renderCustomers() {
  const list = await api('/customers');
  $('#view').innerHTML = `<div class="toolbar"><input data-filter type="search" placeholder="Ad və ya e-poçt…"></div>
    ${table(['Ad', 'E-poçt', 'Sifariş', 'Xərclənən məbləğ', ''], list.map((c) => `<tr data-search="${esc(((c.full_name || '') + ' ' + (c.email || '')).toLowerCase())}">
      <td>${esc(c.full_name || '—')}</td><td>${esc(c.email || '—')}</td><td>${c.orders_count}</td><td>${money(c.total_spent)}</td>
      <td><div class="actions"><button class="btn ghost sm" data-c="${esc(c.id)}">Bax</button></div></td></tr>`), 'Müştəri yoxdur')}`;
  wireFilter($('#view'));
  $('#view').onclick = async (e) => {
    const b = e.target.closest('[data-c]');
    if (!b) return;
    const { profile, orders } = await api(`/customers/${encodeURIComponent(b.dataset.c)}`);
    modal(profile.full_name || profile.email || 'Müştəri', `
      <p><b>E-poçt:</b> ${esc(profile.email || '—')}</p>
      ${table(['Tarix', 'Məbləğ', 'Status'], orders.map((o) => `<tr><td>${fmt(o.created_at)}</td><td>${money(o.total)}</td><td>${STATUS_AZ[o.status] || esc(o.status)}</td></tr>`), 'Sifariş yoxdur')}`);
  };
}

/* ---------- Sayt ayarları ---------- */
async function renderSettings() {
  const rows = await api('/settings');
  const s = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const txt = (k, l) => `<label>${l}<input data-s="${k}" value="${esc(typeof s[k] === 'string' ? s[k] : '')}"></label>`;
  $('#headActions').innerHTML = `<button class="btn" id="saveS">Yadda saxla</button>`;
  $('#view').innerHTML = `<div class="card"><div class="form-grid">
      ${txt('site_name', 'Sayt adı')}${txt('logo_url', 'Logo URL-i')}
      ${txt('whatsapp', 'WhatsApp nömrəsi (məs. 994501234567)')}${txt('chat_url', 'Çat keçidi')}
      ${txt('email', 'E-poçt')}${txt('phone', 'Telefon')}
      <label class="full">Ünvan<input data-s="address" value="${esc(s.address || '')}"></label>
      <label class="full">Sosial şəbəkələr (JSON: {"instagram":"https://…","telegram":"https://…"})
        <textarea data-s="socials">${esc(JSON.stringify(s.socials || {}, null, 2))}</textarea></label>
    </div></div>`;
  $('#saveS').addEventListener('click', async () => {
    const values = {};
    $('#view').querySelectorAll('[data-s]').forEach((el) => { values[el.dataset.s] = el.value.trim(); });
    try { values.socials = JSON.parse(values.socials || '{}'); }
    catch { return toast('Sosial şəbəkələr JSON formatında olmalıdır.', 'err'); }
    try { await api('/settings', { method: 'PUT', json: { values } }); toast('Ayarlar yadda saxlanıldı.'); }
    catch (e) { toast(e.message, 'err'); }
  });
}

boot().catch((e) => showLogin(`Qoşulma xətası: ${e.message}`));

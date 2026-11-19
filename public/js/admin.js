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

const S = { sb: null, me: null, section: 'dashboard', pollTimer: null, thread: null, rows: [], cats: [] };

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
    if (res.status === 401) await logout();
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
  $('#nav').innerHTML = SECTIONS.map(([k, label]) => `<button data-s="${k}">${esc(label)}</button>`).join('');
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
      tr.hidden = !!q && !tr.dataset.search.includes(q);
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
  // şəkil önizləməsi
  ov.querySelectorAll('[data-k][data-preview]').forEach((inp) => {
    const prev = ov.querySelector(`#prev-${inp.dataset.k}`);
    const paint = () => { prev.innerHTML = inp.value ? `<img src="${esc(inp.value)}" alt="">` : '<span class="muted small">Önizləmə</span>'; };
    inp.addEventListener('input', paint);
    paint();
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

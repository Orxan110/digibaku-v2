import { createAuthClient, SupabaseAuthAdapter } from '@neondatabase/neon-js/auth';


let authClientPromise = null;
let sbPromise = null;


export const $ = (selector, root = document) => root.querySelector(selector);


export const esc = (value = '') =>
String(value).replace(/[&<>"']/g, char => ({
'&': '&',
'<': '<',
'>': '>',
'"': '"',
"'": '''
})[char]);


const translations = {
az: {
faq: 'Tez-tez verilən suallar',
loadError: 'Məlumat yüklənmədi'
},
ru: {
faq: 'Часто задаваемые вопросы',
loadError: 'Не удалось загрузить данные'
},
en: {
faq: 'Frequently asked questions',
loadError: 'Failed to load data'
}
};


export function getLang() {
return localStorage.getItem('digibaku_lang') || 'az';
}


export function t(key) {
return translations[getLang()]?.[key] || translations.az[key] || key;
}


export async function api(path, { method = 'GET', json, token } = {}) {
const headers = {};
if (token) headers.Authorization = Bearer ${token};
if (json !== undefined) headers['Content-Type'] = 'application/json';


const response = await fetch(/api${path}, {
method,
headers,
body: json === undefined ? undefined : JSON.stringify(json)
});


const data = await response.json().catch(() => ({}));


if (!response.ok) {
const error = new Error(data.error || 'request_failed');
error.code = data.error;
throw error;
}


return data;
}


export const catalog = () =>
api(/public/catalog?lang=${encodeURIComponent(getLang())});


export async function sb() {
if (!sbPromise) {
sbPromise = (async () => {
const config = await api('/public/config');
if (!config.neonAuthUrl) {
throw new Error('Neon Auth URL təyin edilməyib');
}


  const { createAuthClient, SupabaseAuthAdapter } =
    await import('https://esm.sh/@neondatabase/neon-js');

  const auth = createAuthClient(
    config.neonAuthUrl,
    { adapter: SupabaseAuthAdapter() }
  );

  return { auth };
})();



}


return sbPromise;
}


export async function token() {
try {
const client = await sb();
const { data } = await client.auth.getSession();
return data?.session?.access_token || '';
} catch {
return '';
}
}


export async function mountHeader() {
const header = $('#header');
if (!header) return;


const accessToken = await token();
const account = $('#acc');


if (account && accessToken) {
account.href = 'profile.html';
}
}



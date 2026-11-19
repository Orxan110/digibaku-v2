import { createAuthClient } from 'https://esm.sh/@neondatabase/auth';
import { SupabaseAuthAdapter } from 'https://esm.sh/@neondatabase/auth/vanilla/adapters';


export const $ = (selector, root = document) =>
root.querySelector(selector);


export const esc = (value = '') =>
String(value ?? '').replace(/[&<>"']/g, c => ({
'&': '&',
'<': '<',
'>': '>',
'"': '"',
"'": '''
})[c]);


export const money = value =>
${Number(value || 0).toFixed(2)} AZN;


const LANG_KEY = 'digibaku_lang';


export function getLang() {
const lang = localStorage.getItem(LANG_KEY) || 'az';
return ['az', 'ru', 'en'].includes(lang) ? lang : 'az';
}


export const T = {
az: {
email: 'E-poçt', password: 'Şifrə', fullName: 'Ad və soyad',
login: 'Daxil ol', register: 'Qeydiyyat', reset: 'Şifrəni unutdum',
sendReset: 'Bərpa linki göndər', newPassword: 'Yeni şifrə',
save: 'Yadda saxla', invalidCreds: 'E-poçt və ya şifrə yanlışdır.',
signupOk: 'Qeydiyyat tamamlandı. E-poçtunuzu yoxlayın.',
resetOk: 'Şifrə bərpa linki göndərildi.',
passwordChanged: 'Şifrə dəyişdirildi.',
profile: 'Profilim', logout: 'Çıxış', orders: 'Sifarişlərim',
noOrders: 'Hələ sifarişiniz yoxdur.', profileSaved: 'Profil yeniləndi.',
reviewTitle: 'Rəy yaz', name: 'Adınız', rating: 'Qiymətləndirmə',
reviewText: 'Rəyiniz', send: 'Göndər', reviewOk: 'Rəyiniz göndərildi.',
chat: 'Dəstək çat', chatPlaceholder: 'Mesajınızı yazın...',
chatEmpty: 'Hələ mesaj yoxdur.',
status: {
pending: 'Gözləyir', confirmed: 'Təsdiqləndi',
processing: 'Hazırlanır', completed: 'Tamamlandı',
cancelled: 'Ləğv edildi'
},
faq: 'Tez-tez verilən suallar', prices: 'Qiymətlər',
loadError: 'Məlumat yüklənmədi.',
contactPrice: 'Qiymət üçün əlaqə saxlayın',
notFound: 'Məhsul tapılmadı.', back: 'Geri qayıt',
selectPlan: 'Müddət seçin', qty: 'Miqdar', buy: 'Sifariş et',
askQuestion: 'Sual ver', orderOk: 'Sifariş yaradıldı',
month: 'ay', year: 'il', err: { generic: 'Xəta baş verdi.' }
},
ru: {
email: 'Электронная почта', password: 'Пароль',
fullName: 'Имя и фамилия', login: 'Войти',
register: 'Регистрация', reset: 'Забыли пароль?',
sendReset: 'Отправить ссылку', newPassword: 'Новый пароль',
save: 'Сохранить', invalidCreds: 'Неверная почта или пароль.',
signupOk: 'Регистрация завершена. Проверьте почту.',
resetOk: 'Ссылка для восстановления отправлена.',
passwordChanged: 'Пароль изменён.', profile: 'Мой профиль',
logout: 'Выйти', orders: 'Мои заказы',
noOrders: 'Заказов пока нет.', profileSaved: 'Профиль обновлён.',
reviewTitle: 'Оставить отзыв', name: 'Имя', rating: 'Оценка',
reviewText: 'Ваш отзыв', send: 'Отправить', reviewOk: 'Отзыв отправлен.',
chat: 'Чат поддержки', chatPlaceholder: 'Введите сообщение...',
chatEmpty: 'Сообщений пока нет.',
status: {
pending: 'Ожидает', confirmed: 'Подтверждён',
processing: 'Готовится', completed: 'Завершён',
cancelled: 'Отменён'
},
faq: 'Часто задаваемые вопросы', prices: 'Цены',
loadError: 'Не удалось загрузить данные.', contactPrice: 'Уточните цену',
notFound: 'Товар не найден.', back: 'Назад',
selectPlan: 'Выберите срок', qty: 'Количество', buy: 'Заказать',
askQuestion: 'Задать вопрос', orderOk: 'Заказ создан',
month: 'мес.', year: 'год', err: { generic: 'Произошла ошибка.' }
},
en: {
email: 'Email', password: 'Password', fullName: 'Full name',
login: 'Sign in', register: 'Sign up', reset: 'Forgot password?',
sendReset: 'Send recovery link', newPassword: 'New password',
save: 'Save', invalidCreds: 'Incorrect email or password.',
signupOk: 'Registration complete. Check your email.',
resetOk: 'Password reset link sent.',
passwordChanged: 'Password changed.', profile: 'My profile',
logout: 'Log out', orders: 'My orders',
noOrders: 'You have no orders yet.', profileSaved: 'Profile updated.',
reviewTitle: 'Write a review', name: 'Name', rating: 'Rating',
reviewText: 'Your review', send: 'Send', reviewOk: 'Review submitted.',
chat: 'Support chat', chatPlaceholder: 'Write your message...',
chatEmpty: 'No messages yet.',
status: {
pending: 'Pending', confirmed: 'Confirmed',
processing: 'Processing', completed: 'Completed',
cancelled: 'Cancelled'
},
faq: 'Frequently asked questions', prices: 'Prices',
loadError: 'Failed to load data.', contactPrice: 'Contact us for pricing',
notFound: 'Product not found.', back: 'Go back',
selectPlan: 'Select duration', qty: 'Quantity', buy: 'Order',
askQuestion: 'Ask a question', orderOk: 'Order created',
month: 'mo.', year: 'yr.', err: { generic: 'An error occurred.' }
}
};


export const t = key =>
T[getLang()][key] ?? T.az[key] ?? key;


export function safeNext(value) {
if (!value || !/^(profile|chat|index|product).html(?:[?#].*)?$/.test(value)) {
return 'profile.html';
}
return value;
}


export const monthsLabel = months =>
months === 12
? 1 ${T[getLang()].year}
: ${months} ${T[getLang()].month};


export function fmtDate(value) {
return value ? new Date(value).toLocaleDateString(getLang()) : '';
}


export function fmtTime(value) {
return value ? new Date(value).toLocaleString(getLang()) : '';
}


export function toast(message, success = true) {
let box = $('#toast');


if (!box) {
box = document.createElement('div');
box.id = 'toast';
box.className = 'toast';
document.body.appendChild(box);
}


box.textContent = message;
box.dataset.type = success ? 'success' : 'error';
box.hidden = false;


clearTimeout(box._timer);
box._timer = setTimeout(() => {
box.hidden = true;
}, 3500);
}


export function errMsg(error) {
return error?.message || T[getLang()].err.generic;
}


export async function api(path, { method = 'GET', json, token } = {}) {
const headers = {};


if (token) headers.Authorization = Bearer ${token};
if (json !== undefined) headers['Content-Type'] = 'application/json';


const url = path.startsWith('/api/')
? path
: /api${path.startsWith('/') ? path : /${path}};


const response = await fetch(url, {
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


let authPromise;


export async function sb() {
if (!authPromise) {
authPromise = (async () => {
const config = await api('/public/config');


  if (!config.neonAuthUrl) {
    throw new Error('Neon Auth URL təyin edilməyib.');
  }

  const auth = createAuthClient(config.neonAuthUrl, {
    adapter: SupabaseAuthAdapter()
  });

  return { auth };
})().catch(error => {
  authPromise = null;
  throw error;
});



}


return authPromise;
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
const account = $('#acc');
if (!account) return;


account.href = await token() ? 'profile.html' : 'login.html';
}


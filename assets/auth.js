/* DigiBaku — Neon Auth client. Sessiya tokeni localStorage-da saxlanılır, cookie blok olsa da işləyir. */
(function () {
  var AUTH_BASE = "https://ep-lively-math-betoma1f.neonauth.c-9.us-east-2.aws.neon.tech/neondb/auth";
  var TOKEN_KEY = "digibaku_token";

  var MESSAGES = {
    az: { invalidEmail: "E-poçt düzgün deyil.", shortPassword: "Şifrə ən azı 8 simvol olmalıdır.",
      nameRequired: "Ad daxil edin.", networkError: "Serverlə əlaqə yoxdur. Yenidən cəhd edin.",
      registered: "Qeydiyyat uğurla tamamlandı.", loggedIn: "Daxil oldunuz.", loggedOut: "Çıxış edildi.",
      resetSent: "Şifrə bərpa linki e-poçtunuza göndərildi.", passwordReset: "Şifrə yeniləndi. İndi daxil ola bilərsiniz.",
      genericError: "Xəta baş verdi. Yenidən cəhd edin." },
    ru: { invalidEmail: "Некорректный e-mail.", shortPassword: "Пароль должен содержать минимум 8 символов.",
      nameRequired: "Введите имя.", networkError: "Нет связи с сервером. Попробуйте снова.",
      registered: "Регистрация завершена.", loggedIn: "Вы вошли в аккаунт.", loggedOut: "Вы вышли.",
      resetSent: "Ссылка для сброса пароля отправлена на ваш e-mail.", passwordReset: "Пароль обновлён. Теперь можно войти.",
      genericError: "Произошла ошибка. Попробуйте снова." },
    en: { invalidEmail: "Invalid email address.", shortPassword: "Password must be at least 8 characters.",
      nameRequired: "Please enter your name.", networkError: "Cannot reach the server. Please try again.",
      registered: "Registration completed.", loggedIn: "Signed in.", loggedOut: "Signed out.",
      resetSent: "A password reset link has been sent to your email.", passwordReset: "Password updated. You can sign in now.",
      genericError: "Something went wrong. Please try again." }
  };

  function currentLang() {
    var saved = localStorage.getItem("digibaku_lang");
    return MESSAGES[saved] ? saved : "az";
  }
  function msg(key) { return MESSAGES[currentLang()][key] || MESSAGES.az[key] || key; }

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function validateEmail(email) { return EMAIL_RE.test(String(email || "").trim()); }
  function validatePassword(password) { return typeof password === "string" && password.length >= 8; }

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ""; } catch (e) { return ""; }
  }
  function saveToken(t) {
    try { if (t) localStorage.setItem(TOKEN_KEY, t); } catch (e) {}
  }
  function clearToken() {
    try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
  }

  async function call(path, body, method) {
    var headers = { "Content-Type": "application/json" };
    var tk = getToken();
    if (tk) headers.Authorization = "Bearer " + tk;

    var res;
    try {
      res = await fetch(AUTH_BASE + path, {
        method: method || "POST",
        credentials: "include",
        headers: headers,
        body: body ? JSON.stringify(body) : undefined
      });
    } catch (e) {
      return { ok: false, error: msg("networkError") + " (" + String(e && e.message || e) + ")" };
    }
    var text = "";
    try { text = await res.text(); } catch (e) { text = ""; }
    var data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }

    if (!res.ok) {
      var serverMsg = "";
      if (data) serverMsg = data.message || (data.error && data.error.message) || data.code || "";
      if (!serverMsg) serverMsg = text ? text.slice(0, 150) : msg("genericError");
      return { ok: false, status: res.status, error: serverMsg + " [" + res.status + "]" };
    }
    return { ok: true, data: data };
  }

  var DigiAuth = {
    async register(opts) {
      var name = opts.name, email = opts.email, password = opts.password;
      if (!name || !name.trim()) return { ok: false, error: msg("nameRequired") };
      if (!validateEmail(email)) return { ok: false, error: msg("invalidEmail") };
      if (!validatePassword(password)) return { ok: false, error: msg("shortPassword") };
      var r = await call("/sign-up/email", { name: name.trim(), email: email.trim(), password: password });
      if (!r.ok) return r;
      if (r.data && r.data.token) saveToken(r.data.token);
      return { ok: true, message: msg("registered"), data: r.data };
    },
    async login(opts) {
      var email = opts.email, password = opts.password;
      if (!validateEmail(email)) return { ok: false, error: msg("invalidEmail") };
      if (!password) return { ok: false, error: msg("shortPassword") };
      var r = await call("/sign-in/email", { email: email.trim(), password: password });
      if (!r.ok) return r;
      if (r.data && r.data.token) saveToken(r.data.token);
      return { ok: true, message: msg("loggedIn"), data: r.data };
    },
    async logout() {
      await call("/sign-out", {});
      clearToken();
      return { ok: true, message: msg("loggedOut") };
    },
    async getSession() {
      var r = await call("/get-session", null, "GET");
      if (!r.ok || !r.data || !r.data.user) return { ok: true, session: null };
      return { ok: true, session: r.data };
    },
    // Sifariş API-si üçün: saxlanmış token varsa onu qaytarır
    async getToken() {
      var tk = getToken();
      if (tk) return tk;
      try {
        var res = await fetch(AUTH_BASE + "/token", { credentials: "include" });
        if (!res.ok) return null;
        var j = await res.json();
        return j && j.token ? j.token : null;
      } catch (e) { return null; }
    },
    async requestPasswordReset(opts) {
      var email = opts.email;
      if (!validateEmail(email)) return { ok: false, error: msg("invalidEmail") };
      var r = await call("/request-password-reset", {
        email: email.trim(), redirectTo: opts.redirectTo || (location.origin + "/login.html?reset=1")
      });
      if (!r.ok) return r;
      return { ok: true, message: msg("resetSent") };
    },
    async resetPassword(opts) {
      if (!validatePassword(opts.newPassword)) return { ok: false, error: msg("shortPassword") };
      var r = await call("/reset-password", { token: opts.token, newPassword: opts.newPassword });
      if (!r.ok) return r;
      return { ok: true, message: msg("passwordReset") };
    },
    msg: msg,
    validateEmail: validateEmail,
    validatePassword: validatePassword
  };

  window.DigiAuth = DigiAuth;
})();

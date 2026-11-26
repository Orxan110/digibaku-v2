/* DigiBaku — Neon Auth client. Sorğular /api/auth üzərindən keçir (cookie saytın öz domenində saxlanır). */
(function () {
  var AUTH_BASE = "/api/auth";

  var MESSAGES = {
    az: { invalidEmail: "E-poçt düzgün deyil.", shortPassword: "Şifrə ən azı 8 simvol olmalıdır.",
      nameRequired: "Ad daxil edin.", networkError: "Serverlə əlaqə yoxdur. Yenidən cəhd edin.",
      registered: "Qeydiyyat uğurla tamamlandı.", loggedIn: "Daxil oldunuz.", loggedOut: "Çıxış edildi.",
      resetSent: "Şifrə bərpa linki e-poçtunuza göndərildi.", passwordReset: "Şifrə yeniləndi. İndi daxil ola bilərsiniz.",
      genericError: "Xəta baş verdi. Yenidən cəhd edin.",
      nameUpdated: "Ad yeniləndi.", emailRequested: "Sorğu qəbul edildi. Dəyişiklik təsdiq tələb edərsə, yeni e-poçtunuza link göndəriləcək.",
      passwordChanged: "Şifrə dəyişdirildi.", currentRequired: "Cari şifrəni daxil edin.", passwordMismatch: "Yeni şifrə və təkrarı eyni deyil.",
      samePassword: "Yeni şifrə cari şifrədən fərqli olmalıdır.", sameEmail: "Bu, artıq cari e-poçtunuzdur." },
    ru: { invalidEmail: "Некорректный e-mail.", shortPassword: "Пароль должен содержать минимум 8 символов.",
      nameRequired: "Введите имя.", networkError: "Нет связи с сервером. Попробуйте снова.",
      registered: "Регистрация завершена.", loggedIn: "Вы вошли в аккаунт.", loggedOut: "Вы вышли.",
      resetSent: "Ссылка для сброса пароля отправлена на ваш e-mail.", passwordReset: "Пароль обновлён. Теперь можно войти.",
      genericError: "Произошла ошибка. Попробуйте снова.",
      nameUpdated: "Имя обновлено.", emailRequested: "Запрос принят. Если потребуется подтверждение, ссылка придёт на новый e-mail.",
      passwordChanged: "Пароль изменён.", currentRequired: "Введите текущий пароль.", passwordMismatch: "Новый пароль и повтор не совпадают.",
      samePassword: "Новый пароль должен отличаться от текущего.", sameEmail: "Это уже ваш текущий e-mail." },
    en: { invalidEmail: "Invalid email address.", shortPassword: "Password must be at least 8 characters.",
      nameRequired: "Please enter your name.", networkError: "Cannot reach the server. Please try again.",
      registered: "Registration completed.", loggedIn: "Signed in.", loggedOut: "Signed out.",
      resetSent: "A password reset link has been sent to your email.", passwordReset: "Password updated. You can sign in now.",
      genericError: "Something went wrong. Please try again.",
      nameUpdated: "Name updated.", emailRequested: "Request accepted. If confirmation is required, a link will be sent to the new email.",
      passwordChanged: "Password changed.", currentRequired: "Enter your current password.", passwordMismatch: "New password and confirmation do not match.",
      samePassword: "New password must differ from the current one.", sameEmail: "This is already your current email." }
  };

  function currentLang() {
    var saved = localStorage.getItem("digibaku_lang");
    return MESSAGES[saved] ? saved : "az";
  }
  function msg(key) { return MESSAGES[currentLang()][key] || MESSAGES.az[key] || key; }

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function validateEmail(email) { return EMAIL_RE.test(String(email || "").trim()); }
  function validatePassword(password) { return typeof password === "string" && password.length >= 8; }

  async function call(path, body, method) {
    var res;
    try {
      res = await fetch(AUTH_BASE + path, {
        method: method || "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
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
      try { localStorage.setItem("digibaku_authhint", "1"); } catch (e) {}
      return { ok: true, message: msg("registered"), data: r.data };
    },
    async login(opts) {
      var email = opts.email, password = opts.password;
      if (!validateEmail(email)) return { ok: false, error: msg("invalidEmail") };
      if (!password) return { ok: false, error: msg("shortPassword") };
      var r = await call("/sign-in/email", { email: email.trim(), password: password });
      if (!r.ok) return r;
      try { localStorage.setItem("digibaku_authhint", "1"); } catch (e) {}
      return { ok: true, message: msg("loggedIn"), data: r.data };
    },
    async logout() {
      try { localStorage.removeItem("digibaku_authhint"); } catch (e) {}
      var r = await call("/sign-out", {});
      return r.ok ? { ok: true, message: msg("loggedOut") } : r;
    },
    async getSession() {
      var r = await call("/get-session", null, "GET");
      if (!r.ok || !r.data || !r.data.user) return { ok: true, session: null };
      return { ok: true, session: r.data };
    },
    async getToken() {
      try {
        var res = await fetch(AUTH_BASE + "/token", { credentials: "include" });
        if (!res.ok) return null;
        var j = await res.json();
        return j && j.token ? j.token : null;
      } catch (e) { return null; }
    },
    async updateName(name) {
      if (!name || !name.trim()) return { ok: false, error: msg("nameRequired") };
      var r = await call("/update-user", { name: name.trim().slice(0, 80) });
      if (!r.ok) return r;
      return { ok: true, message: msg("nameUpdated") };
    },
    async changeEmail(opts) {
      var email = String(opts.newEmail || "").trim();
      if (!validateEmail(email)) return { ok: false, error: msg("invalidEmail") };
      if (opts.currentEmail && email.toLowerCase() === String(opts.currentEmail).toLowerCase()) return { ok: false, error: msg("sameEmail") };
      var r = await call("/change-email", { newEmail: email, callbackURL: location.origin + "/profile.html" });
      if (!r.ok) return r;
      return { ok: true, message: msg("emailRequested") };
    },
    async changePassword(opts) {
      if (!opts.currentPassword) return { ok: false, error: msg("currentRequired") };
      if (!validatePassword(opts.newPassword)) return { ok: false, error: msg("shortPassword") };
      if (opts.newPassword !== opts.confirm) return { ok: false, error: msg("passwordMismatch") };
      if (opts.newPassword === opts.currentPassword) return { ok: false, error: msg("samePassword") };
      var r = await call("/change-password", { currentPassword: opts.currentPassword, newPassword: opts.newPassword, revokeOtherSessions: false });
      if (!r.ok) return r;
      return { ok: true, message: msg("passwordChanged") };
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

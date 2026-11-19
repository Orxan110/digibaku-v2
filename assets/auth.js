/* DigiBaku — Neon Auth client. Sorğular saytın öz /api/auth yolu üzərindən gedir (cookie birinci tərəf olsun deyə). */
(function () {
  const AUTH_BASE = "/api/auth";

  const MESSAGES = {
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
    const saved = localStorage.getItem("digibaku_lang");
    return MESSAGES[saved] ? saved : "az";
  }
  function msg(key) { return MESSAGES[currentLang()][key] || MESSAGES.az[key] || key; }

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function validateEmail(email) { return EMAIL_RE.test(String(email || "").trim()); }
  function validatePassword(password) { return typeof password === "string" && password.length >= 8; }

  async function call(path, body, method) {
    let res;
    try {
      res = await fetch(AUTH_BASE + path, {
        method: method || "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined
      });
    } catch (e) {
      return { ok: false, error: msg("networkError") };
    }
    let data = null;
    try { data = await res.json(); } catch (e) { data = null; }
    if (!res.ok) {
      const serverMsg = data && (data.message || (data.error && data.error.message));
      return { ok: false, status: res.status, error: serverMsg || msg("genericError") };
    }
    return { ok: true, data };
  }

  const DigiAuth = {
    async register({ name, email, password }) {
      if (!name || !name.trim()) return { ok: false, error: msg("nameRequired") };
      if (!validateEmail(email)) return { ok: false, error: msg("invalidEmail") };
      if (!validatePassword(password)) return { ok: false, error: msg("shortPassword") };
      const r = await call("/sign-up/email", { name: name.trim(), email: email.trim(), password });
      if (!r.ok) return r;
      return { ok: true, message: msg("registered"), data: r.data };
    },
    async login({ email, password }) {
      if (!validateEmail(email)) return { ok: false, error: msg("invalidEmail") };
      if (!password) return { ok: false, error: msg("shortPassword") };
      const r = await call("/sign-in/email", { email: email.trim(), password });
      if (!r.ok) return r;
      return { ok: true, message: msg("loggedIn"), data: r.data };
    },
    async logout() {
      const r = await call("/sign-out", {});
      return r.ok ? { ok: true, message: msg("loggedOut") } : r;
    },
    async getSession() {
      const r = await call("/get-session", null, "GET");
      if (!r.ok || !r.data || !r.data.user) return { ok: true, session: null };
      return { ok: true, session: r.data };
    },
    // Sifariş API-si üçün JWT token
    async getToken() {
      try {
        const res = await fetch(AUTH_BASE + "/token", { credentials: "include" });
        if (!res.ok) return null;
        const j = await res.json();
        return j && j.token ? j.token : null;
      } catch (e) { return null; }
    },
    async requestPasswordReset({ email, redirectTo }) {
      if (!validateEmail(email)) return { ok: false, error: msg("invalidEmail") };
      const r = await call("/request-password-reset", {
        email: email.trim(), redirectTo: redirectTo || (location.origin + "/login.html?reset=1")
      });
      if (!r.ok) return r;
      return { ok: true, message: msg("resetSent") };
    },
    async resetPassword({ token, newPassword }) {
      if (!validatePassword(newPassword)) return { ok: false, error: msg("shortPassword") };
      const r = await call("/reset-password", { token, newPassword });
      if (!r.ok) return r;
      return { ok: true, message: msg("passwordReset") };
    },
    msg, validateEmail, validatePassword
  };

  window.DigiAuth = DigiAuth;
})();

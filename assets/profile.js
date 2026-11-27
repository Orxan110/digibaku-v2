/* DigiBaku — profil: ad, e-poçt və şifrəni dəyişmək */
(async function () {
  var box = document.getElementById("profileBox");
  var lang = (window.DB && DB.lang) || "az";
  var TX = {
    az: { login: "Profilə baxmaq üçün", loginLink: "daxil olun", name: "Ad", email: "E-poçt", save: "Yadda saxla",
      nameH: "Ad", emailH: "E-poçt ünvanı", passH: "Şifrəni dəyiş", newEmail: "Yeni e-poçt", cur: "Cari şifrə", nw: "Yeni şifrə (ən azı 8 simvol)",
      rep: "Yeni şifrə (təkrar)", change: "Şifrəni dəyiş", orders: "Sifarişlərim", logout: "Çıxış", saving: "Yadda saxlanır..." },
    ru: { login: "Чтобы посмотреть профиль,", loginLink: "войдите", name: "Имя", email: "E-mail", save: "Сохранить",
      nameH: "Имя", emailH: "Адрес e-mail", passH: "Сменить пароль", newEmail: "Новый e-mail", cur: "Текущий пароль", nw: "Новый пароль (минимум 8 символов)",
      rep: "Новый пароль (повтор)", change: "Сменить пароль", orders: "Мои заказы", logout: "Выйти", saving: "Сохранение..." },
    en: { login: "To view your profile,", loginLink: "sign in", name: "Name", email: "Email", save: "Save",
      nameH: "Name", emailH: "Email address", passH: "Change password", newEmail: "New email", cur: "Current password", nw: "New password (at least 8 characters)",
      rep: "New password (repeat)", change: "Change password", orders: "My orders", logout: "Sign out", saving: "Saving..." }
  };
  var t = TX[lang] || TX.az;

  var r = await DigiAuth.getSession();
  if (!r.session) {
    box.innerHTML = '<div class="empty">' + esc(t.login) + ' <a href="login.html?next=profile.html">' + esc(t.loginLink) + "</a>.</div>";
    return;
  }
  var u = r.session.user;
  var cur = { name: u.name || "", email: u.email || "" };

  function msgBox(id) { return '<div class="err" id="' + id + 'E"></div><div class="ok" id="' + id + 'O"></div>'; }
  function section(h, inner) {
    return '<div style="border-top:1px solid var(--line);padding-top:16px;margin-top:16px"><h2 style="font-size:17px;margin-bottom:12px">' + esc(h) + "</h2>" + inner + "</div>";
  }

  function draw() {
    box.innerHTML =
      '<p><b>' + esc(t.name) + ':</b> <span id="curName">' + esc(cur.name || "-") + '</span></p>' +
      '<p><b>' + esc(t.email) + ':</b> <span id="curEmail">' + esc(cur.email || "-") + "</span></p>" +
      section(t.nameH,
        '<form id="fName" autocomplete="off"><div class="field"><label for="pName">' + esc(t.name) + '</label><input id="pName" type="text" maxlength="80" value="' + esc(cur.name) + '"></div>' +
        msgBox("n") + '<button class="btn gold" type="submit">' + esc(t.save) + "</button></form>") +
      section(t.emailH,
        '<form id="fEmail" autocomplete="off"><div class="field"><label for="pEmail">' + esc(t.newEmail) + '</label><input id="pEmail" type="email" value="' + esc(cur.email) + '" autocomplete="email"></div>' +
        msgBox("e") + '<button class="btn gold" type="submit">' + esc(t.save) + "</button></form>") +
      section(t.passH,
        '<form id="fPass"><div class="field"><label for="pCur">' + esc(t.cur) + '</label><input id="pCur" type="password" autocomplete="current-password"></div>' +
        '<div class="field"><label for="pNew">' + esc(t.nw) + '</label><input id="pNew" type="password" autocomplete="new-password"></div>' +
        '<div class="field"><label for="pRep">' + esc(t.rep) + '</label><input id="pRep" type="password" autocomplete="new-password"></div>' +
        msgBox("p") + '<button class="btn gold" type="submit">' + esc(t.change) + "</button></form>") +
      '<p style="margin:20px 0 12px"><a class="btn" href="orders.html">' + esc(t.orders) + "</a></p>" +
      '<button class="btn" id="logoutBtn">' + esc(t.logout) + "</button>";

    function show(id, res) {
      document.getElementById(id + "E").textContent = res.ok ? "" : res.error;
      document.getElementById(id + "O").textContent = res.ok ? res.message : "";
    }
    function busy(form, on) {
      var b = form.querySelector("button[type=submit]");
      if (b) { b.disabled = on; }
    }

    document.getElementById("fName").onsubmit = async function (e) {
      e.preventDefault();
      busy(this, true);
      var v = document.getElementById("pName").value;
      var res = await DigiAuth.updateName(v);
      busy(this, false);
      show("n", res);
      if (res.ok) { cur.name = v.trim(); document.getElementById("curName").textContent = cur.name; }
    };
    document.getElementById("fEmail").onsubmit = async function (e) {
      e.preventDefault();
      busy(this, true);
      var res = await DigiAuth.changeEmail({ newEmail: document.getElementById("pEmail").value, currentEmail: cur.email });
      busy(this, false);
      show("e", res);
    };
    document.getElementById("fPass").onsubmit = async function (e) {
      e.preventDefault();
      busy(this, true);
      var res = await DigiAuth.changePassword({
        currentPassword: document.getElementById("pCur").value,
        newPassword: document.getElementById("pNew").value,
        confirm: document.getElementById("pRep").value
      });
      busy(this, false);
      show("p", res);
      if (res.ok) { ["pCur", "pNew", "pRep"].forEach(function (id) { document.getElementById(id).value = ""; }); }
    };
    document.getElementById("logoutBtn").onclick = async function () { if (window.DigiBalance) DigiBalance.clear(); await DigiAuth.logout(); location.replace("index.html"); };
  }
  draw();
})();

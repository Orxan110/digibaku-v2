(function () {
  var key = document.body.getAttribute("data-page");
  if (!key) return;
  var lang = (window.DB && DB.lang) || "az";
  var tEl = document.getElementById("pTitle");
  var bEl = document.getElementById("pBody");
  var EMPTY = { az: "Mətn tezliklə əlavə olunacaq.", ru: "Текст скоро будет добавлен.", en: "The text will be added soon." };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  fetch("/api/settings?page=" + encodeURIComponent(key))
    .then(function (r) { return r.json(); })
    .then(function (d) {
      var p = (d && d.page) || {};
      var title = p["title_" + lang] || p.title_az;
      var body = p["body_" + lang] || p.body_az;
      if (title && tEl) tEl.textContent = title;
      if (!bEl) return;
      if (body) {
        bEl.innerHTML = body.split(/\n{2,}/).map(function (par) {
          return '<p style="margin:0 0 14px">' + esc(par).replace(/\n/g, "<br>") + "</p>";
        }).join("");
      } else {
        bEl.textContent = EMPTY[lang] || EMPTY.az;
      }
    })
    .catch(function () { if (bEl) bEl.textContent = EMPTY[lang] || EMPTY.az; });
})();

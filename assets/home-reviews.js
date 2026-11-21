(function () {
  var lang = (window.DB && DB.lang) || "az";
  var box = document.getElementById("revEmpty");
  if (!box) return;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function stars(n) {
    n = Math.max(0, Math.min(5, Number(n) || 0));
    return "★".repeat(n) + "☆".repeat(5 - n);
  }

  fetch("/api/products")
    .then(function (r) { return r.json(); })
    .then(function (d) {
      var list = (d && d.reviews) || [];
      if (!list.length) return;
      var wrap = document.createElement("div");
      wrap.style.display = "grid";
      wrap.style.gap = "10px";
      wrap.style.gridTemplateColumns = "repeat(auto-fit,minmax(240px,1fr))";
      wrap.innerHTML = list.map(function (r) {
        var text = r["body_" + lang] || r.body_az || r.body_en || r.body_ru || "";
        var date = r.review_date ? String(r.review_date).slice(0, 10) : "";
        return '<div class="card-box">' +
          '<div style="color:#d4af37;letter-spacing:2px">' + stars(r.rating) + "</div>" +
          '<p style="margin:8px 0;color:#d4d4d4">' + esc(text) + "</p>" +
          '<div class="muted" style="font-size:13px">' + esc(r.author_name) +
          (date ? " · " + esc(date) : "") + "</div></div>";
      }).join("");
      box.replaceWith(wrap);
    })
    .catch(function () {});
})();

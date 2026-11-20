(function () {
  var lang = (window.DB && DB.lang) || "az";
  var T = { az: "Bu məhsul haqqında suallar", ru: "Вопросы о товаре", en: "Questions about this product" };
  var slug = new URLSearchParams(location.search).get("slug") || "";
  var box = document.getElementById("pdBox");
  if (!slug || !box) return;

  var faqs = null;
  var loading = false;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function render() {
    var rows = faqs.filter(function (f) { return f.language === lang; });
    if (!rows.length) rows = faqs.filter(function (f) { return f.language === "az"; });
    if (!rows.length) return;
    var sec = document.createElement("section");
    sec.id = "pFaq";
    sec.style.margin = "28px 0";
    sec.innerHTML = '<h2 style="font-size:20px;margin-bottom:12px">' + esc(T[lang] || T.az) + "</h2>" +
      rows.map(function (f) {
        return '<details style="border:1px solid #262626;border-radius:12px;background:#111;margin-bottom:8px">' +
          '<summary style="padding:14px;cursor:pointer;font-weight:600">' + esc(f.question) + "</summary>" +
          '<p style="padding:0 14px 14px;color:#a3a3a3">' + esc(f.answer) + "</p></details>";
      }).join("");
    box.appendChild(sec);
  }

  function mount() {
    if (!box.querySelector(".order-box") || box.querySelector("#pFaq")) return;
    if (faqs === null) {
      if (loading) return;
      loading = true;
      fetch("/api/faq?product=" + encodeURIComponent(slug))
        .then(function (r) { return r.json(); })
        .then(function (d) { faqs = d.faqs || []; loading = false; mount(); })
        .catch(function () { faqs = []; loading = false; });
      return;
    }
    render();
  }

  // product.js səhifəni hər dəfə yenidən çəkdikdə FAQ bölməsini yenidən əlavə edir
  new MutationObserver(mount).observe(box, { childList: true, subtree: true });
  mount();
})();

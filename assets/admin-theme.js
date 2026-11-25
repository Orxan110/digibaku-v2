// Admin panel üçün rəng mövzusu: saytdakı əsas rəng (--gold) admin paneldə də avtomatik tətbiq olunur.
(function () {
  var HEX = /^#[0-9a-fA-F]{6}$/;
  function hexRgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  function rgbHex(a) { return "#" + a.map(function (n) { n = Math.max(0, Math.min(255, Math.round(n))); return (n < 16 ? "0" : "") + n.toString(16); }).join(""); }
  function onColor(h) { var c = hexRgb(h); return (c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114) > 150 ? "#000" : "#fff"; }

  function paint(g, sl) {
    g = HEX.test(g || "") ? g : "";
    sl = HEX.test(sl || "") ? sl : "";
    var st = document.documentElement.style;
    ["--gold", "--gold-d", "--gold-rgb", "--sale", "--on-gold", "--on-sale"].forEach(function (k) { st.removeProperty(k); });
    var old = document.getElementById("dbAdminThemeStyle");
    if (!g && !sl) { if (old) old.remove(); return; }
    var c = hexRgb(g || "#d4af37");
    if (g) {
      st.setProperty("--gold", g);
      st.setProperty("--gold-d", rgbHex(c.map(function (n) { return n * 0.86; })));
    }
    st.setProperty("--gold-rgb", c.join(","));
    st.setProperty("--on-gold", g ? onColor(g) : "#000");
    if (sl) st.setProperty("--sale", sl);
    st.setProperty("--on-sale", onColor(sl || g));
    if (!old) { old = document.createElement("style"); old.id = "dbAdminThemeStyle"; document.head.appendChild(old); }
    old.textContent =
      ".btn.gold,.badge,.ad-link.on{color:var(--on-gold)!important}" +
      ".ad-link.on{background:var(--gold)!important}" +
      "[style*=\"background:#d4af37\"]{background:var(--gold)!important;color:var(--on-gold)!important}" +
      "[style*=\"color:#d4af37\"]{color:var(--gold)!important}" +
      "[style*=\"border:1px solid #d4af37\"]{border-color:var(--gold)!important}" +
      "[style*=\"border-bottom-color: rgb(212, 175, 55)\"]{border-bottom-color:var(--gold)!important}";
  }

  function fromSettings(set) {
    set = set || {};
    var g = HEX.test(set.color_gold || "") ? set.color_gold : "";
    var s = HEX.test(set.color_sale || "") ? set.color_sale : "";
    var b = HEX.test(set.color_bg || "") ? set.color_bg : "";
    var c = HEX.test(set.color_card || "") ? set.color_card : "";
    try { localStorage.setItem("digibaku_theme", JSON.stringify({ g: g, s: s, b: b, c: c })); } catch (e) {}
    paint(g, s);
  }

  // 1) Son yadda qalan rəngi dərhal tətbiq et (yanıb-sönmə olmasın)
  try {
    var th = JSON.parse(localStorage.getItem("digibaku_theme") || "null");
    if (th) paint(th.g, th.s);
  } catch (e) {}

  // 2) Serverdən aktual rəngi götür
  try {
    fetch("/api/settings", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (d) {
      if (d && d.settings) fromSettings(d.settings);
    }).catch(function () {});
  } catch (e) {}

  window.AdminTheme = { paint: paint, fromSettings: fromSettings };
})();

(function () {
  var lang = (window.DB && DB.lang) || "az";

  function pick(b, key) {
    return b[key + "_" + lang] || b[key + "_az"] || "";
  }

  fetch("/api/banners")
    .then(function (r) { return r.json(); })
    .then(function (d) {
      var b = (d.banners || [])[0];
      if (!b) return;
      var box = document.querySelector(".banner");
      if (!box) return;
      var h = document.getElementById("heroTitle");
      var s = document.getElementById("heroSub");
      var btn = document.getElementById("heroBtn");
      if (h && pick(b, "title")) h.textContent = pick(b, "title");
      if (s && pick(b, "subtitle")) s.textContent = pick(b, "subtitle");
      if (btn) {
        if (pick(b, "cta_label")) btn.textContent = pick(b, "cta_label");
        if (b.cta_url) btn.setAttribute("href", b.cta_url);
      }
      if (b.image_url) {
        box.style.backgroundImage = "linear-gradient(rgba(0,0,0,.55),rgba(0,0,0,.85)),url('" +
          String(b.image_url).replace(/'/g, "%27") + "')";
        box.style.backgroundSize = "cover";
        box.style.backgroundPosition = "center";
      }
    })
    .catch(function () {});
})();

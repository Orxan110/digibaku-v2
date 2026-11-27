/* DigiBaku — məhsul səhifəsində üzən WhatsApp/çat düymələrini alt panelin üstünə qaldırır (hündürlük ölçülür) */
(function () {
  function place() {
    var fabs = document.querySelector(".fabs");
    var bar = document.querySelector(".sticky-bar");
    if (!fabs) return;
    if (!bar) { fabs.style.bottom = ""; return; }
    // Mobildə alt menyu 64px-dir, altındakı alt panel də onun üstündədir
    var base = window.innerWidth < 900 ? 64 : 0;
    var h = bar.getBoundingClientRect().height || 0;
    fabs.style.bottom = (base + h + 12) + "px";
  }
  setInterval(place, 400);
  window.addEventListener("resize", place);
})();

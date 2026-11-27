/* DigiBaku — məhsul səhifəsində üzən WhatsApp/çat düymələrini alt panelin üstünə qaldırır */
(function () {
  var s = document.createElement("style");
  s.textContent =
    "@media(max-width:899px){body:has(.sticky-bar) .fabs{bottom:calc(160px + env(safe-area-inset-bottom))}}" +
    "@media(min-width:900px){body:has(.sticky-bar) .fabs{bottom:112px}}";
  document.head.appendChild(s);
})();

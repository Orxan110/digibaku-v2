      "</div>";
    document.getElementById("stickyOrder").onclick = function () {
      document.getElementById("orderBox").scrollIntoView({ behavior: "smooth", block: "center" });
      orderViaWhatsApp();
    };
  }

  async function init() {
    var res = await fetch("/api/products");
    if (!res.ok) { showErr("API cavabı: " + res.status); return; }
    var data = await res.json();
    var p = (data.products || []).filter(function (x) { return x.slug === slug; })[0];
    if (!p) {
      box.setAttribute("data-ready", "1");
      box.innerHTML = '<div class="empty">' + esc(t.notFound) + ' <a href="products.html">' + esc(t.back) + "</a></div>";
      return;
    }
    document.title = nameOf(p) + " — DigiBaku";
    state.product = p;
    if (window.DB) DB.currentProduct = p;
    state.months = sorted(p)[0].months;
    draw();

    // Giriş edibsə, qeydiyyatdakı ad avtomatik doldurulur (məcburi deyil)
    if (window.DigiAuth) {
      DigiAuth.getSession().then(function (r) {
        var nm = r && r.session && r.session.user && r.session.user.name;
        var inp = document.getElementById("fName");
        if (nm && inp && !inp.value) { inp.value = nm; state.name = nm; }
      }).catch(function () {});
    }
  }

  init().catch(showErr);
})();

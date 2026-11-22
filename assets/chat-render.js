/* Çat mesajlarını göstərmək üçün ortaq modul (sayt çatı + admin paneli).
   Xam linklər göstərilmir:
     {{p|slug|Ad|Qiymət}}        -> məhsul kartı
     [Yazı](product.html?slug=x) -> düymə
     https://wa.me/994...        -> "WhatsApp-da yaz" düyməsi
     **qalın**                   -> qalın mətn
   Köhnə mesajlardakı xam "product.html?slug=..." və "wa.me" yazıları da avtomatik düymə/karta çevrilir. */
(function () {
  var L = {
    az: { open: "Bax", wa: "WhatsApp-da yaz", prod: "Ətraflı bax", all: "Bütün məhsullar", link: "Keçid" },
    ru: { open: "Открыть", wa: "Написать в WhatsApp", prod: "Подробнее", all: "Все товары", link: "Ссылка" },
    en: { open: "View", wa: "Chat on WhatsApp", prod: "View details", all: "All products", link: "Link" }
  };
  function lg() {
    var l = (window.DB && DB.lang) || "az";
    return L[l] ? l : "az";
  }
  function T(k) { return L[lg()][k]; }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  var INTERNAL = /^(?:product\.html\?slug=[A-Za-z0-9%_\-]+|products\.html(?:\?[A-Za-z0-9=&%_\-]*)?|(?:chat|cart|faq|contact|rules|about|orders|profile|index)\.html)$/;
  var WA = /^https:\/\/wa\.me\/\d{6,15}(?:\?text=[A-Za-z0-9%._~\-]*)?$/;
  function okUrl(u) { return INTERNAL.test(u) || WA.test(u); }

  function btn(label, url) {
    var wa = WA.test(url);
    var text = label;
    if (!text || (wa && /^whatsapp$/i.test(text))) text = wa ? T("wa") : T("open");
    if (!wa && /^product\.html/.test(url) && /^(bax|open|view)$/i.test(text)) text = T("prod");
    var cls = "cm-btn" + (wa ? " wa" : "");
    return '<a class="' + cls + '" href="' + esc(url) + '"' + (wa ? ' target="_blank" rel="noopener noreferrer"' : "") + ">" + esc(text) + "</a>";
  }
  function card(c) {
    return '<a class="cm-card" href="product.html?slug=' + esc(c.slug) + '"><span class="cm-card-t"><b>' + esc(c.name) + "</b>" +
      (c.price ? "<em>" + esc(c.price) + "</em>" : "") + '</span><span class="cm-card-go" aria-hidden="true">›</span></a>';
  }

  // Mətn içindəki (inline) qaydalar
  var INLINE = /\[([^\]\n]{1,60})\]\(([^)\s]{1,300})\)|\*\*([^*\n]{1,120})\*\*|https?:\/\/[^\s<>"']+|\bproducts?\.html(?:\?slug=[A-Za-z0-9%_\-]+)?/g;
  function inline(raw) {
    var out = "", last = 0, m;
    INLINE.lastIndex = 0;
    while ((m = INLINE.exec(raw))) {
      out += esc(raw.slice(last, m.index));
      last = m.index + m[0].length;
      if (m[3] != null) {
        out += "<strong>" + esc(m[3]) + "</strong>";
      } else if (m[1] != null) {
        if (okUrl(m[2])) out += btn(m[1], m[2]);
        else if (/^https?:\/\//i.test(m[2])) out += '<a href="' + esc(m[2]) + '" target="_blank" rel="noopener noreferrer nofollow">' + esc(m[1]) + "</a>";
        else out += esc(m[1]);
      } else {
        var u = m[0], tail = "";
        var tm = u.match(/[.,;:!?)]+$/);
        if (tm && /^https?:/i.test(u)) { tail = tm[0]; u = u.slice(0, -tail.length); }
        if (okUrl(u)) out += btn("", u);
        else if (/^https?:\/\//i.test(u)) {
          var host = T("link");
          try { host = new URL(u).hostname.replace(/^www\./, ""); } catch (e) {}
          out += '<a href="' + esc(u) + '" target="_blank" rel="noopener noreferrer nofollow">' + esc(host) + " ↗</a>";
        } else out += esc(u);
        out += esc(tail);
      }
    }
    return out + esc(raw.slice(last));
  }

  function parse(body) {
    var raw = String(body == null ? "" : body).replace(/\r\n?/g, "\n").split("\n");
    var segs = [];
    function push(type, item) {
      var last = segs[segs.length - 1];
      if (last && last.type === type) { last.items.push(item); return; }
      segs.push({ type: type, items: [item] });
    }
    for (var i = 0; i < raw.length; i++) {
      var tl = raw[i].trim(), m;
      // Yeni format: {{p|slug|ad|qiymət}}
      if ((m = tl.match(/^\{\{p\|([A-Za-z0-9%_\-]+)\|([^|}]*)\|([^}]*)\}\}$/))) {
        push("card", { slug: m[1], name: m[2].trim(), price: m[3].trim() });
        continue;
      }
      // Köhnə format: "• Ad — qiymət" + növbəti sətirdə product.html?slug=...
      if ((m = tl.match(/^•\s+(.+)\s+—\s+([^—]+)$/)) && i + 1 < raw.length) {
        var mm = raw[i + 1].trim().match(/^product\.html\?slug=([A-Za-z0-9%_\-]+)$/);
        if (mm) { push("card", { slug: mm[1], name: m[1].trim(), price: m[2].trim() }); i++; continue; }
      }
      // "Yazı: link" -> düymə (məs. "WhatsApp: https://wa.me/...", "Bütün məhsullar: products.html")
      if ((m = tl.match(/^([^:\[\]]{1,40}):\s*(\S+)$/)) && okUrl(m[2])) {
        push("btn", { label: m[1].trim(), url: m[2] });
        continue;
      }
      // Yalnız link olan sətir
      if (okUrl(tl)) { push("btn", { label: "", url: tl }); continue; }
      // Yalnız [yazı](link) olan sətir(lər)
      if (/^(?:\[[^\]\n]{1,60}\]\([^)\s]{1,300}\)\s*)+$/.test(tl)) {
        var re = /\[([^\]\n]{1,60})\]\(([^)\s]{1,300})\)/g, x, any = false;
        while ((x = re.exec(tl))) {
          if (okUrl(x[2])) { push("btn", { label: x[1], url: x[2] }); any = true; }
        }
        if (any) continue;
      }
      push("text", raw[i]);
    }
    return segs;
  }

  // Bot/operator mesajı -> HTML
  function html(body) {
    return parse(body).map(function (s) {
      if (s.type === "card") return '<div class="cm-cards">' + s.items.map(card).join("") + "</div>";
      if (s.type === "btn") return '<div class="cm-actions">' + s.items.map(function (b) { return btn(b.label, b.url); }).join("") + "</div>";
      var txt = s.items.join("\n").replace(/^\n+|\n+$/g, "");
      return txt ? '<div class="cm-text">' + inline(txt) + "</div>" : "";
    }).join("");
  }

  // Siyahı üçün sadə mətn önizləməsi (linksiz)
  function plain(body) {
    return parse(body).map(function (s) {
      if (s.type === "card") return s.items.map(function (c) { return c.name; }).join(", ");
      if (s.type === "btn") return "";
      return s.items.join(" ").replace(/\*\*/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
    }).join(" ").replace(/\s+/g, " ").trim();
  }

  window.ChatRender = { html: html, plain: plain, esc: esc };
})();

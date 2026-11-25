/* DigiBaku — ümumi header, naviqasiya, səbət, üzən düymələr, RU/EN tərcümə, sayt parametrləri, SEO, şəkil xətası qoruması. */
(function(){
  // Şəkil xətası: 1) eyni linki (sorğu parametrləri ilə, məs. ?img=ID) gecikmə ilə yenidən yoxla,
  // 2) yalnız faylın uzantısı varsa digər uzantıları yoxla, 3) marka yazılı nişan göstər.
  (function(){
    var EXT = ["webp", "png", "jpg", "jpeg", "avif"];
    document.addEventListener("error", function(e){
      var im = e.target;
      if(!im || im.tagName !== "IMG" || !im.hasAttribute("data-img")) return;
      var base = im.getAttribute("data-src0");
      if(!base){ base = im.getAttribute("src") || ""; im.setAttribute("data-src0", base); }
      var step = parseInt(im.getAttribute("data-fb") || "0", 10);
      var sep = base.indexOf("?") === -1 ? "?" : "&";
      var cands = [base + sep + "cb=" + Date.now(), base + sep + "cb=" + (Date.now() + 1)];
      var m = base.match(/^([^?#]*)\.([A-Za-z0-9]+)$/);
      if(m){ EXT.forEach(function(x){ if(x !== m[2].toLowerCase()) cands.push(m[1] + "." + x); }); }
      e.stopImmediatePropagation();
      if(step < cands.length){
        im.setAttribute("data-fb", String(step + 1));
        setTimeout(function(){ im.setAttribute("src", cands[step]); }, step === 0 ? 0 : 800);
        return;
      }
      var name = String(im.getAttribute("alt") || "").trim().split(/\s+/)[0] || "";
      var ph = document.createElement("span");
      ph.className = "imgfb";
      ph.textContent = name;
      ph.style.cssText = "display:flex;align-items:center;justify-content:center;width:100%;height:100%;padding:8px;box-sizing:border-box;text-align:center;font-weight:800;font-size:clamp(16px,4vw,24px);color:var(--gold);letter-spacing:.5px";
      im.replaceWith(ph);
    }, true);
  })();


  // Rəng mövzusu (admin paneldən): əsas rəng (--gold), endirim rəngi (--sale), sayt fonu (--bg) və kart rəngi (--card).
  // Son seçim yadda saxlanılır ki, səhifə açılanda köhnə rəng "yanıb-sönməsin".
  var HEX = /^#[0-9a-fA-F]{6}$/;
  function hexRgb(h){ return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)]; }
  function rgbHex(a){ return "#" + a.map(function(n){ n = Math.max(0, Math.min(255, Math.round(n))); return (n < 16 ? "0" : "") + n.toString(16); }).join(""); }
  function lum(h){ var c = hexRgb(h); return c[0]*0.299 + c[1]*0.587 + c[2]*0.114; }
  function onColor(h){ return lum(h) > 150 ? "#000" : "#fff"; }
  function mixHex(a, b, t){ var x = hexRgb(a), y = hexRgb(b); return rgbHex([x[0]+(y[0]-x[0])*t, x[1]+(y[1]-x[1])*t, x[2]+(y[2]-x[2])*t]); }
  var THEME_VARS = ["--gold","--gold-d","--gold-rgb","--sale","--on-gold","--on-sale","--bg","--bg-rgb","--card","--card2","--line","--text","--muted"];
  function paintTheme(g, sl, bg, cd){
    var st = document.documentElement.style;
    THEME_VARS.forEach(function(k){ st.removeProperty(k); });
    var old = document.getElementById("dbThemeStyle");
    if(!g && !sl && !bg && !cd){ if(old) old.remove(); return; }
    var c = hexRgb(g || "#d4af37");
    if(g){
      st.setProperty("--gold", g);
      st.setProperty("--gold-d", rgbHex(c.map(function(n){ return n * 0.86; })));
    }
    st.setProperty("--gold-rgb", c.join(","));
    st.setProperty("--on-gold", g ? onColor(g) : "#000");
    if(sl) st.setProperty("--sale", sl);
    st.setProperty("--on-sale", onColor(sl || g || "#d4af37"));
    var css =
      ".btn.gold,.badge,.chat-av,.cm-row.me .cm-b,.chat-send,.chip.on,.ptabs-nav button.on,.pt-rich ol.pt-steps li::before,.dbf-btn.fill,.dbf-brand .mk{color:var(--on-gold)!important}" +
      ".pbadge,.sale{background:var(--sale,var(--gold))!important;color:var(--on-sale)!important}" +
      ".stars,.starpick button.on,[style*=\"color:#d4af37\"]{color:var(--gold)!important}" +
      "[style*=\"border:1px solid #d4af37\"]{border-color:var(--gold)!important}" +
      "footer.dbf{background:radial-gradient(900px 260px at 12% 0,rgba(var(--gold-rgb),.09),transparent 70%),#050505!important}" +
      "footer.dbf .dbf-cta{border-color:rgba(var(--gold-rgb),.35)!important;background:linear-gradient(135deg,rgba(var(--gold-rgb),.1),#0c0c0c 70%)!important}" +
      "footer.dbf .dbf-btn.line:hover,.btn-out:hover{background:rgba(var(--gold-rgb),.12)!important}" +
      "#dbChatPanel .chat-hours{background:rgba(var(--gold-rgb),.12)!important}";
    // Sayt fonu və kartlar: yazı rəngi fona görə avtomatik seçilir
    if(bg || cd){
      var b0 = bg || "#000000";
      var light = lum(b0) > 150;
      var cardc = cd || (light ? mixHex(b0, "#ffffff", 0.65) : mixHex(b0, "#ffffff", 0.07));
      var textc = light ? "#111111" : "#f5f5f5";
      st.setProperty("--bg", b0);
      st.setProperty("--bg-rgb", hexRgb(b0).join(","));
      st.setProperty("--card", cardc);
      st.setProperty("--card2", mixHex(cardc, light ? "#000000" : "#ffffff", 0.06));
      st.setProperty("--line", mixHex(b0, textc, 0.17));
      st.setProperty("--text", textc);
      st.setProperty("--muted", light ? "#5f5f5f" : "#a3a3a3");
      css +=
        "header.top{background:rgba(var(--bg-rgb),.92)!important}" +
        ".bottom-nav{background:rgba(var(--bg-rgb),.96)!important}" +
        ".banner{background:linear-gradient(135deg,var(--card2),var(--bg))!important}" +
        "footer.dbf{background:radial-gradient(900px 260px at 12% 0,rgba(var(--gold-rgb),.09),transparent 70%),var(--bg)!important}" +
        "footer.dbf .dbf-cta{background:linear-gradient(135deg,rgba(var(--gold-rgb),.1),var(--card) 70%)!important}" +
        ".sk i{background:linear-gradient(90deg,var(--card2) 25%,var(--line) 50%,var(--card2) 75%)!important;background-size:200% 100%!important}";
      if(light){
        css += ".pt-rich p,.pt-rich ul,.rv p,[style*=\"color:#d4d4d4\"]{color:var(--text)!important}";
      }
    }
    if(!old){ old = document.createElement("style"); old.id = "dbThemeStyle"; document.head.appendChild(old); }
    old.textContent = css;
  }
  function applyTheme(set){
    set = set || {};
    var g = HEX.test(set.color_gold || "") ? set.color_gold : "";
    var sl = HEX.test(set.color_sale || "") ? set.color_sale : "";
    var bg = HEX.test(set.color_bg || "") ? set.color_bg : "";
    var cd = HEX.test(set.color_card || "") ? set.color_card : "";
    try{ localStorage.setItem("digibaku_theme", JSON.stringify({g: g, s: sl, b: bg, c: cd})); }catch(e){}
    paintTheme(g, sl, bg, cd);
  }
  try{
    var th = JSON.parse(localStorage.getItem("digibaku_theme") || "null");
    if(th){
      var tg = HEX.test(th.g || "") ? th.g : "", ts = HEX.test(th.s || "") ? th.s : "";
      var tb = HEX.test(th.b || "") ? th.b : "", tc = HEX.test(th.c || "") ? th.c : "";
      if(tg || ts || tb || tc) paintTheme(tg, ts, tb, tc);
    }
  }catch(e){}

  // Çat və WhatsApp düymələri (admin paneldən): rəng və şəkil ikon; çat üçün göstər/gizlət də var.
  // İkonun ətrafındakı boş (şəffaf və ya tək rəngli) kənarlar avtomatik kəsilir ki, şəkil dairəni tam doldursun.
  var trimCache = {}, fabSeq = { chat: 0, wa: 0 };
  function trimIcon(src, cb){
    if(trimCache[src]){ cb(trimCache[src]); return; }
    var im = new Image();
    im.onload = function(){
      var out = src;
      try{
        var W = im.width, H = im.height;
        var tw = Math.min(W, 256), k = tw / W, th = Math.max(1, Math.round(H * k));
        var c = document.createElement("canvas"); c.width = tw; c.height = th;
        var cx = c.getContext("2d"); cx.drawImage(im, 0, 0, tw, th);
        var d = cx.getImageData(0, 0, tw, th).data;
        function px(i, j){ var o = (j * tw + i) * 4; return [d[o], d[o+1], d[o+2], d[o+3]]; }
        var cs = [px(0,0), px(tw-1,0), px(0,th-1), px(tw-1,th-1)];
        var clear = cs.every(function(p){ return p[3] < 20; });
        var bg = null;
        if(!clear && cs.every(function(p){ return p[3] > 235; })){
          bg = [0,1,2].map(function(n){ return (cs[0][n] + cs[1][n] + cs[2][n] + cs[3][n]) / 4; });
          if(cs.some(function(p){ return Math.abs(p[0]-bg[0]) + Math.abs(p[1]-bg[1]) + Math.abs(p[2]-bg[2]) > 60; })) bg = null;
        }
        if(clear || bg){
          var x0 = tw, y0 = th, x1 = -1, y1 = -1;
          for(var j = 0; j < th; j++){
            for(var i = 0; i < tw; i++){
              var o = (j * tw + i) * 4;
              var on = d[o+3] > 20 && (clear || (Math.abs(d[o]-bg[0]) + Math.abs(d[o+1]-bg[1]) + Math.abs(d[o+2]-bg[2]) > 60));
              if(on){ if(i < x0) x0 = i; if(i > x1) x1 = i; if(j < y0) y0 = j; if(j > y1) y1 = j; }
            }
          }
          if(x1 >= x0 && y1 >= y0){
            var side = Math.min(Math.max(x1 - x0 + 1, y1 - y0 + 1), tw, th);
            var mx = (x0 + x1 + 1) / 2, my = (y0 + y1 + 1) / 2;
            var sx = Math.max(0, Math.min(tw - side, mx - side / 2)), sy = Math.max(0, Math.min(th - side, my - side / 2));
            if(side < Math.min(tw, th) * 0.95){
              var oc = document.createElement("canvas"); oc.width = 128; oc.height = 128;
              oc.getContext("2d").drawImage(im, sx / k, sy / k, side / k, side / k, 0, 0, 128, 128);
              out = oc.toDataURL("image/png");
            }
          }
        }
      }catch(e){ out = src; }
      trimCache[src] = out;
      cb(out);
    };
    im.onerror = function(){ cb(src); };
    im.src = src;
  }
  var ICON_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+\/=]+$/;
  function paintFabNow(kind, o){
    o = o || {};
    var id = kind === "wa" ? "dbWaFabStyle" : "dbChatFabStyle";
    var sel = kind === "wa" ? "a.fab.wa" : "a.fab.chat";
    var old = document.getElementById(id);
    var css = "";
    if(kind === "chat" && o.show === false){
      css = "a.fab.chat,#dbChatLauncher{display:none!important}#dbChatGreet{display:none!important}";
    } else {
      if(HEX.test(o.color || "")){
        css += sel + "{background-color:" + o.color + "!important;box-shadow:0 0 18px rgba(" + hexRgb(o.color).join(",") + ",.55)!important}";
      }
      if(ICON_RE.test(o.icon || "")){
        css += sel + " svg{display:none!important}" +
          sel + "{background-image:url(" + o.icon + ")!important;background-repeat:no-repeat!important;background-position:center!important;background-size:cover!important}";
      }
    }
    if(!css){ if(old) old.remove(); return; }
    if(!old){ old = document.createElement("style"); old.id = id; document.head.appendChild(old); }
    old.textContent = css;
  }
  function paintFab(kind, o){
    o = o || {};
    var seq = ++fabSeq[kind];
    var ico = ICON_RE.test(o.icon || "") ? o.icon : "";
    if(o.show === false || !ico){ paintFabNow(kind, o); return; }
    if(trimCache[ico]){ paintFabNow(kind, { show: o.show, color: o.color, icon: trimCache[ico] }); return; }
    paintFabNow(kind, { show: o.show, color: o.color, icon: "" });
    trimIcon(ico, function(t){
      if(seq !== fabSeq[kind]) return;
      paintFabNow(kind, { show: o.show, color: o.color, icon: t });
    });
  }
  function applyChatFab(set){
    set = set || {};
    var o = { show: set.chat_show !== "0", color: HEX.test(set.color_chat || "") ? set.color_chat : "", icon: set.chat_icon || "" };
    try{ localStorage.setItem("digibaku_chatfab", JSON.stringify(o)); }catch(e){}
    paintFab("chat", o);
  }
  function applyWaFab(set){
    set = set || {};
    var o = { color: HEX.test(set.color_wa || "") ? set.color_wa : "", icon: set.wa_icon || "" };
    try{ localStorage.setItem("digibaku_wafab", JSON.stringify(o)); }catch(e){}
    paintFab("wa", o);
  }
  try{
    var cf = JSON.parse(localStorage.getItem("digibaku_chatfab") || "null");
    if(cf) paintFab("chat", cf);
    var wf = JSON.parse(localStorage.getItem("digibaku_wafab") || "null");
    if(wf) paintFab("wa", wf);
  }catch(e){}

  // Bayram effektləri (admin paneldən): assets/effects.js yalnız effekt aktiv olanda yüklənir
  var fxWant = null, fxLoading = false;
  function fxActive(set){
    var t = set.fx_type || "";
    if(!/^(snow|bonfire|confetti|hearts|fireworks|petals)$/.test(t)) return "";
    var d = new Date(), today = d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
    if(set.fx_from && today < set.fx_from) return "";
    if(set.fx_to && today > set.fx_to) return "";
    return t;
  }
  function runFx(type, level){
    fxWant = { t: type, l: level };
    if(window.DBFx){ window.DBFx.set(type, level); return; }
    if(!type || fxLoading) return;
    fxLoading = true;
    var s = document.createElement("script");
    s.src = "/assets/effects.js";
    s.onload = function(){ fxLoading = false; if(window.DBFx && fxWant) window.DBFx.set(fxWant.t, fxWant.l); };
    s.onerror = function(){ fxLoading = false; };
    document.body.appendChild(s);
  }
  function applyFx(set){
    set = set || {};
    try{ localStorage.setItem("digibaku_fx", JSON.stringify({ fx_type: set.fx_type || "", fx_level: set.fx_level || "2", fx_from: set.fx_from || "", fx_to: set.fx_to || "" })); }catch(e){}
    runFx(fxActive(set), parseInt(set.fx_level, 10) || 2);
  }
  try{
    var fxc = JSON.parse(localStorage.getItem("digibaku_fx") || "null");
    if(fxc && fxActive(fxc)) runFx(fxActive(fxc), parseInt(fxc.fx_level, 10) || 2);
  }catch(e){}

  var T = {
    az:{home:"Ana səhifə",products:"Məhsullar",cart:"Səbət",orders:"Sifarişlər",profile:"Profilim",
        login:"Daxil ol",register:"Qeydiyyat",search:"Məhsul axtar...",faq:"FAQ",contact:"Əlaqə",
        about:"Haqqımızda",terms:"İstifadə şərtləri",privacy:"Məxfilik siyasəti",rules:"Sifariş və xidmət qaydaları",
        menu:"Menyu",logout:"Çıxış",add:"Səbətə at",details:"Ətraflı",from:"dən",empty:"Məhsul tapılmadı.",
        cartEmpty:"Səbətiniz boşdur.",total:"Ümumi",checkout:"Sifarişi təsdiq et"},
    ru:{home:"Главная",products:"Товары",cart:"Корзина",orders:"Заказы",profile:"Профиль",
        login:"Вход",register:"Регистрация",search:"Поиск товаров...",faq:"FAQ",contact:"Контакты",
        about:"О нас",terms:"Условия использования",privacy:"Политика конфиденциальности",rules:"Правила заказа и услуг",
        menu:"Меню",logout:"Выйти",add:"В корзину",details:"Подробнее",from:"от",empty:"Товары не найдены.",
        cartEmpty:"Корзина пуста.",total:"Итого",checkout:"Подтвердить заказ"},
    en:{home:"Home",products:"Products",cart:"Cart",orders:"Orders",profile:"Profile",
        login:"Sign in",register:"Register",search:"Search products...",faq:"FAQ",contact:"Contact",
        about:"About us",terms:"Terms of use",privacy:"Privacy policy",rules:"Order & service rules",
        menu:"Menu",logout:"Sign out",add:"Add to cart",details:"Details",from:"from",empty:"No products found.",
        cartEmpty:"Your cart is empty.",total:"Total",checkout:"Confirm order"}
  };
  var lang = localStorage.getItem("digibaku_lang");
  if(!T[lang]) lang="az";
  window.DB = {
    lang: lang, settings: {}, t: function(k){return (T[lang][k]||T.az[k]||k);},
    setLang: function(l){ if(T[l]){ localStorage.setItem("digibaku_lang",l); location.reload(); } },
    // Sayt parametri: cari dil üçün (city -> city_ru), yoxdursa AZ, yoxdursa birbaşa açar
    sv: function(key){
      var s = this.settings || {};
      return s[key + "_" + lang] || s[key + "_az"] || s[key] || "";
    },
    // WhatsApp keçidi: nömrə admin paneldən gəlir
    waLink: function(text){
      var digits = String(this.settings.whatsapp || "").replace(/\D/g, "");
      if(!digits) return "#";
      return "https://wa.me/" + digits + (text ? "?text=" + encodeURIComponent(text) : "");
    },
    cart: {
      get: function(){ try{return JSON.parse(localStorage.getItem("digibaku_cart")||"[]");}catch(e){return [];} },
      save: function(c){ localStorage.setItem("digibaku_cart",JSON.stringify(c)); window.dispatchEvent(new Event("cart-changed")); },
      add: function(key,months){ var c=this.get(); var f=c.find(function(i){return i.product_key===key&&i.months===months;});
        if(f) f.qty+=1; else c.push({product_key:key,months:months,qty:1}); this.save(c); },
      setQty: function(key,months,q){ var c=this.get().map(function(i){ if(i.product_key===key&&i.months===months) i.qty=Math.max(1,q); return i;}); this.save(c); },
      remove: function(key,months){ this.save(this.get().filter(function(i){return !(i.product_key===key&&i.months===months);})); },
      count: function(){ return this.get().reduce(function(s,i){return s+i.qty;},0); }
    }
  };
  document.documentElement.lang = lang;

  function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
  window.esc = esc;

  var I18N = {
    "Ana səhifə":["Главная","Home"], "Məhsullar":["Товары","Products"], "Səbət":["Корзина","Cart"],
    "Sifarişlər":["Заказы","Orders"], "Sifarişlərim":["Мои заказы","My orders"], "Profilim":["Профиль","Profile"],
    "Daxil ol":["Вход","Sign in"], "Qeydiyyat":["Регистрация","Register"], "Qeydiyyatdan keçin":["Зарегистрироваться","Sign up"],
    "Məhsul axtar...":["Поиск товаров...","Search products..."], "Əlaqə":["Контакты","Contact"],
    "Haqqımızda":["О нас","About us"], "İstifadə şərtləri":["Условия использования","Terms of use"],
    "Məxfilik siyasəti":["Политика конфиденциальности","Privacy policy"],
    "Sifariş və xidmət qaydaları":["Правила заказа и услуг","Order & service rules"],
    "Çıxış":["Выйти","Sign out"], "Menyu":["Меню","Menu"], "Məhsullara bax":["Смотреть товары","Browse products"],
    "Hamısı":["Все","All"], "Ətraflı bax":["Подробнее","View details"], "Ətraflı":["Подробнее","Details"],
    "Səbətə at":["В корзину","Add to cart"], "WhatsApp-la sifariş et":["Заказать в WhatsApp","Order via WhatsApp"],
    "Ad və soyad":["Имя и фамилия","Full name"], "Adınız":["Ваше имя","Your name"],
    "WhatsApp nömrəniz":["Ваш номер WhatsApp","Your WhatsApp number"], "Müddət seçin":["Выберите срок","Choose duration"],
    "Müddət":["Срок","Duration"], "ay":["мес.","mo"], "Şifrəni unutdunuz?":["Забыли пароль?","Forgot password?"],
    "E-poçt":["E-mail","Email"], "Şifrə":["Пароль","Password"],
    "Sifarişləri görmək üçün daxil olun.":["Чтобы увидеть заказы, войдите.","Sign in to see your orders."],
    "Hələ sifarişiniz yoxdur.":["У вас пока нет заказов.","You have no orders yet."],
    "Tez-tez verilən suallar":["Частые вопросы","Frequently asked questions"],
    "Məhsullara qayıt":["Назад к товарам","Back to products"], "← Məhsullara qayıt":["← Назад к товарам","← Back to products"],
    "Sifariş məlumatları":["Данные заказа","Order details"], "Səbətiniz boşdur.":["Корзина пуста.","Your cart is empty."],
    "Ümumi":["Итого","Total"], "Sifarişi təsdiq et":["Подтвердить заказ","Confirm order"],
    "Sil":["Удалить","Remove"], "Yüklənir...":["Загрузка...","Loading..."], "Şəkil yoxdur":["Нет изображения","No image"],
    "DigiBaku-nun üstünlükləri":["Преимущества DigiBaku","Why DigiBaku"],
    "Müştəri rəyləri":["Отзывы клиентов","Customer reviews"],
    "Rəylər tezliklə əlavə olunacaq.":["Отзывы скоро появятся.","Reviews will be added soon."],
    "Premium rəqəmsal xidmətlərimizi kəşf edin.":["Откройте для себя наши премиальные цифровые сервисы.","Discover our premium digital services."],
    "Bu kateqoriyada məhsul yoxdur.":["В этой категории нет товаров.","No products in this category."],
    "Məhsul tapılmadı.":["Товар не найден.","Product not found."]
  };

  function tr(text){
    var key = text.trim();
    var pair = I18N[key];
    if(!pair) return null;
    return text.replace(key, pair[lang==="ru"?0:1]);
  }
  function translateNode(node){
    var v = node.nodeValue; if(!v || !v.trim()) return;
    var out = tr(v); if(out !== null && out !== v) node.nodeValue = out;
  }
  function translateTree(root){
    if(root.nodeType===3){ translateNode(root); return; }
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var n; while((n = w.nextNode())){
      var p = n.parentNode;
      if(p && (p.tagName==="SCRIPT" || p.tagName==="STYLE")) continue;
      translateNode(n);
    }
    if(root.querySelectorAll){
      root.querySelectorAll("[placeholder]").forEach(function(el){
        var pr = I18N[el.getAttribute("placeholder")];
        if(pr) el.setAttribute("placeholder", pr[lang==="ru"?0:1]);
      });
    }
  }
  function startI18n(){
    if(lang==="az") return;
    translateTree(document.body);
    var mo = new MutationObserver(function(muts){
      muts.forEach(function(m){ m.addedNodes.forEach(function(nd){ translateTree(nd); }); });
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  var page = (location.pathname.split("/").pop()||"index.html");
  var navItems = [
    {href:"index.html",k:"home",i:"⌂"},{href:"products.html",k:"products",i:"▦"},
    {href:"cart.html",k:"cart",i:"🛒",badge:true},{href:"orders.html",k:"orders",i:"☰"},{href:"profile.html",k:"profile",i:"◉"}
  ];

  var FAB_CSS = ".fab{width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:none;box-shadow:0 6px 18px rgba(0,0,0,.45);padding:0;color:#fff}" +
    ".fab svg{width:28px;height:28px}" +
    ".fab.chat{background:#3b63e0;box-shadow:0 0 18px rgba(59,99,224,.55)}" +
    ".fab.wa{background:#66cc77;box-shadow:0 0 18px rgba(102,204,119,.5)}";
  var fabStyle = document.createElement("style");
  fabStyle.textContent = FAB_CSS;
  document.head.appendChild(fabStyle);

  var CHAT_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path fill="#fff" d="M12 3C6.5 3 2 6.6 2 11c0 2.2 1.1 4.2 2.9 5.6L4 21l4.6-2.3c1.1.3 2.2.5 3.4.5 5.5 0 10-3.6 10-8.2S17.5 3 12 3z"/>' +
    '<circle cx="7.5" cy="11" r="1.5" fill="#3b63e0"/><circle cx="12" cy="11" r="1.5" fill="#3b63e0"/><circle cx="16.5" cy="11" r="1.5" fill="#3b63e0"/></svg>';

  var WA_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path fill="#fff" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12.051 21.785h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884zm8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>';

  function header(){
    var el=document.getElementById("site-header"); if(!el) return;
    el.innerHTML =
     '<header class="top"><div class="wrap">'+
     '<div class="top-row">'+
       '<a class="logo" id="siteLogo" href="index.html">DigiBaku</a>'+
       '<select class="lang" id="langSel" aria-label="Language"><option value="az">AZ</option><option value="ru">RU</option><option value="en">EN</option></select>'+
       '<div class="auth-links" id="authLinks"><a class="btn ghost" href="login.html">'+DB.t("login")+'</a><a class="btn gold" href="login.html?mode=register">'+DB.t("register")+'</a></div>'+
       '<button class="burger" id="burger" aria-label="'+DB.t("menu")+'"><span></span><span></span><span></span></button>'+
     '</div>'+
     '<form class="search" action="products.html" method="get"><input name="q" type="search" placeholder="'+DB.t("search")+'" value="'+esc(new URLSearchParams(location.search).get("q")||"")+'"></form>'+
     '</div></header>'+
     '<div class="drawer" id="drawer"><div class="drawer-panel"><button class="drawer-close" id="closeDrawer" aria-label="close">×</button>'+
       '<a href="index.html">'+DB.t("home")+'</a><a href="products.html">'+DB.t("products")+'</a>'+
       '<a href="faq.html">'+DB.t("faq")+'</a><a href="contact.html">'+DB.t("contact")+'</a><a href="about.html">'+DB.t("about")+'</a>'+
       '<a href="rules.html">'+DB.t("rules")+'</a><a href="privacy.html">'+DB.t("privacy")+'</a><a href="terms.html">'+DB.t("terms")+'</a>'+
       '<a href="#" id="logoutLink">'+DB.t("logout")+'</a></div></div>';
    document.getElementById("langSel").value=lang;
    document.getElementById("langSel").onchange=function(){DB.setLang(this.value);};
    document.getElementById("burger").onclick=function(){document.getElementById("drawer").classList.add("open");};
    document.getElementById("closeDrawer").onclick=function(){document.getElementById("drawer").classList.remove("open");};
    document.getElementById("drawer").onclick=function(e){ if(e.target.id==="drawer") this.classList.remove("open"); };
    var lo=document.getElementById("logoutLink");
    lo.onclick=async function(e){ e.preventDefault(); if(window.DigiAuth){ await DigiAuth.logout(); } location.href="index.html"; };
  }

  function bottomNav(){
    var el=document.getElementById("bottom-nav"); if(!el) return;
    el.className="bottom-nav";
    el.innerHTML = navItems.map(function(n){
      var active = (page===n.href)?' class="active"':'';
      var b = n.badge ? '<span class="badge" id="cartBadge">0</span>' : '';
      return '<a href="'+n.href+'"'+active+'><span class="ico">'+n.i+'</span><span>'+DB.t(n.k)+b+'</span></a>';
    }).join("");
  }

  function fabs(){
    var el=document.getElementById("fabs"); if(!el) return;
    el.className="fabs";
    el.innerHTML = '<a class="fab chat" href="chat.html" aria-label="Chat">'+CHAT_SVG+'</a>'+
      '<a class="fab wa" id="fabWa" href="#" target="_blank" rel="noopener" aria-label="WhatsApp">'+WA_SVG+'</a>';
  }

  // Sayt parametrlərini səhifəyə tətbiq edir (bütün səhifələrdə eyni mənbə)
  function applySettings(){
    var logo = document.getElementById("siteLogo");
    if(logo && DB.sv("logo_text")) logo.textContent = DB.sv("logo_text");

    var wa = document.getElementById("fabWa");
    if(wa){
      if(DB.settings.whatsapp){ wa.href = DB.waLink(""); wa.style.display = ""; }
      else { wa.style.display = "none"; }
    }

    document.querySelectorAll("[data-set]").forEach(function(el){
      el.textContent = DB.sv(el.getAttribute("data-set"));
    });
    document.querySelectorAll("[data-set-href]").forEach(function(el){
      var k = el.getAttribute("data-set-href");
      var v = "";
      if(k === "whatsapp") v = DB.waLink("");
      else if(k === "phone") v = DB.settings.phone ? "tel:" + DB.settings.phone.replace(/\s/g, "") : "";
      else if(k === "email") v = DB.settings.email ? "mailto:" + DB.settings.email : "";
      else if(k === "instagram") v = DB.settings.instagram || "";
      else if(k === "tiktok") v = DB.settings.tiktok || "";
      if(v){ el.href = v; el.style.display = ""; }
      else { el.style.display = "none"; }
    });
  }

  // SEO: başlıq, təsvir, açar sözlər, Open Graph, canonical (admin paneldən)
  var SEO_PAGES = { "": "home", "index": "home", "products": "products", "faq": "faq", "contact": "contact",
    "about": "about", "rules": "rules", "privacy": "privacy", "terms": "terms" };
  function setMeta(attr, name, content){
    if(!content) return;
    var el = document.head.querySelector("meta[" + attr + '="' + name + '"]');
    if(!el){ el = document.createElement("meta"); el.setAttribute(attr, name); document.head.appendChild(el); }
    el.setAttribute("content", content);
  }
  function applySeo(seo){
    if(!seo) return;
    var file = (location.pathname.split("/").pop() || "").replace(/\.html$/, "");
    var key = SEO_PAGES[file];
    if(!key) return;
    var s = {};
    [seo["default"] || {}, seo[key] || {}].forEach(function(src){
      Object.keys(src).forEach(function(k){ if(src[k]) s[k] = src[k]; });
    });
    function g(f){ return s[f + "_" + lang] || s[f + "_az"] || ""; }
    var title = g("title"), desc = g("desc"), kw = g("keywords");
    if(title){
      document.title = title;
      setMeta("property", "og:title", title);
      setMeta("name", "twitter:title", title);
    }
    if(desc){
      setMeta("name", "description", desc);
      setMeta("property", "og:description", desc);
      setMeta("name", "twitter:description", desc);
    }
    if(kw) setMeta("name", "keywords", kw);
    if(s.og_image){
      var img = s.og_image.charAt(0) === "/" ? location.origin + s.og_image : s.og_image;
      setMeta("property", "og:image", img);
      setMeta("name", "twitter:image", img);
    }
    setMeta("property", "og:type", "website");
    setMeta("property", "og:url", location.origin + location.pathname);
    setMeta("name", "twitter:card", s.og_image ? "summary_large_image" : "summary");
    var link = document.head.querySelector('link[rel="canonical"]');
    if(!link){ link = document.createElement("link"); link.setAttribute("rel", "canonical"); document.head.appendChild(link); }
    link.setAttribute("href", location.origin + location.pathname);
  }

  function loadSettings(){
    fetch("/api/settings")
      .then(function(r){ return r.json(); })
      .then(function(d){
        if(d && d.settings){ DB.settings = d.settings; applySettings(); applyTheme(d.settings); applyChatFab(d.settings); applyWaFab(d.settings); applyFx(d.settings); }
        if(d && d.seo){ applySeo(d.seo); }
      })
      .catch(function(){});
  }

  function updateCartBadge(){ var b=document.getElementById("cartBadge"); if(b) b.textContent=DB.cart.count(); }
  window.addEventListener("cart-changed", updateCartBadge);

  async function authState(){
    if(!window.DigiAuth) return;
    var r = await DigiAuth.getSession();
    if(r.session){
      var a=document.getElementById("authLinks");
      if(a) a.innerHTML='<a class="btn ghost" href="profile.html">'+DB.t("profile")+'</a>';
    }
  }

    // Çat paneli: bütün səhifələrdə sağdan açılan yan panel (assets/chat-widget.js)
  function loadChatWidget(){
    if(document.getElementById("dbChatPanel")) return;
    var s=document.createElement("script"); s.src="/assets/chat-widget.js"; document.body.appendChild(s);
  }

  document.addEventListener("DOMContentLoaded", function(){
    header(); bottomNav(); fabs(); updateCartBadge(); authState();
    var ft=document.createElement("script"); ft.src="/assets/footer.js"; document.body.appendChild(ft);
    startI18n();
    loadSettings();
    loadChatWidget();
  });
})();

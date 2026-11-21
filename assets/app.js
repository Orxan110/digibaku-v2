/* DigiBaku — ümumi header, naviqasiya, səbət, üzən düymələr, RU/EN tərcümə, sayt parametrləri. */
(function(){
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

  function loadSettings(){
    fetch("/api/settings")
      .then(function(r){ return r.json(); })
      .then(function(d){
        if(d && d.settings){ DB.settings = d.settings; applySettings(); }
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

  document.addEventListener("DOMContentLoaded", function(){
    header(); bottomNav(); fabs(); updateCartBadge(); authState();
    startI18n();
    loadSettings();
  });
})();

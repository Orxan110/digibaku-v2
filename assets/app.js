/* DigiBaku — ümumi header, naviqasiya, səbət, axtarış. */
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
    lang: lang, t: function(k){return (T[lang][k]||T.az[k]||k);},
    setLang: function(l){ if(T[l]){ localStorage.setItem("digibaku_lang",l); location.reload(); } },
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

  var page = (location.pathname.split("/").pop()||"index.html");
  var navItems = [
    {href:"index.html",k:"home",i:"⌂"},{href:"products.html",k:"products",i:"▦"},
    {href:"cart.html",k:"cart",i:"🛒",badge:true},{href:"orders.html",k:"orders",i:"☰"},{href:"profile.html",k:"profile",i:"◉"}
  ];

  function header(){
    var el=document.getElementById("site-header"); if(!el) return;
    el.innerHTML =
     '<header class="top"><div class="wrap">'+
     '<div class="top-row">'+
       '<a class="logo" href="index.html">DigiBaku</a>'+
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
    el.innerHTML = '<a class="fab" href="chat.html" aria-label="Chat">Chat</a>'+
      '<a class="fab wa" href="https://wa.me/994513626349" target="_blank" rel="noopener" aria-label="WhatsApp">WA</a>';
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
  });
})();

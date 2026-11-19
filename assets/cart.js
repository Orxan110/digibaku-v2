(async function(){
  var box=document.getElementById("cartBox"), err=document.getElementById("cartErr");
  var r=await DBApi.get("/api/products");
  var catalog=(r.data&&r.data.products)||[];
  function draw(){
    var cart=DB.cart.get();
    if(!cart.length){ box.innerHTML='<div class="empty">'+DB.t("cartEmpty")+' <a href="products.html">Məhsullara bax</a></div>'; return; }
    var total=0;
    var rows=cart.map(function(i){
      var p=catalog.find(function(x){return x.product_key===i.product_key;});
      if(!p) return "";
      var pr=p.prices.find(function(x){return x.months===i.months;});
      if(!pr) return "";
      var line=pr.price*i.qty; total+=line;
      return '<div class="cart-line"><div><b>'+esc(p.name.az)+'</b><div class="muted">'+i.months+' ay · '+pr.price.toFixed(2)+' AZN</div></div>'+
        '<div class="qty"><button data-a="-" data-k="'+esc(i.product_key)+'" data-m="'+i.months+'">−</button><span>'+i.qty+'</span><button data-a="+" data-k="'+esc(i.product_key)+'" data-m="'+i.months+'">+</button>'+
        '<button class="btn ghost" data-a="x" data-k="'+esc(i.product_key)+'" data-m="'+i.months+'">Sil</button></div>'+
        '<div class="price">'+line.toFixed(2)+' AZN</div></div>';
    }).join("");
    box.innerHTML = rows + '<p style="margin:14px 0;font-size:18px"><b>'+DB.t("total")+': <span class="price">'+total.toFixed(2)+' AZN</span></b></p>'+
      '<button class="btn gold" id="checkoutBtn" style="width:100%">'+DB.t("checkout")+'</button>';
    box.querySelectorAll("[data-a]").forEach(function(b){
      b.onclick=function(){
        var k=b.dataset.k, m=Number(b.dataset.m), it=DB.cart.get().find(function(x){return x.product_key===k&&x.months===m;});
        if(b.dataset.a==="x") DB.cart.remove(k,m);
        else if(b.dataset.a==="+") DB.cart.setQty(k,m,it.qty+1);
        else DB.cart.setQty(k,m,it.qty-1);
        draw();
      };
    });
    document.getElementById("checkoutBtn").onclick=checkout;
  }
  async function checkout(){
    err.textContent="";
    var btn=document.getElementById("checkoutBtn"); btn.disabled=true;
    var res=await DBApi.post("/api/orders",{items:DB.cart.get()});
    btn.disabled=false;
    if(res.status===401){ location.href="login.html?next=cart.html"; return; }
    if(!res.ok){ err.textContent=(res.data&&res.data.error)||"Sifariş yaradılmadı."; return; }
    DB.cart.save([]);
    location.href="orders.html?created=1";
  }
  draw();
  window.addEventListener("cart-changed", function(){ if(!document.hidden) draw(); });
})();

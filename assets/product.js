(async function(){
  var lang=DB.lang, box=document.getElementById("productBox");
  var slug=new URLSearchParams(location.search).get("slug")||"";
  var r=await DBApi.get("/api/products");
  if(!r.ok){ box.innerHTML='<div class="empty">Məhsul yüklənmədi.</div>'; return; }
  var p=(r.data.products||[]).find(function(x){return x.slug===slug;});
  if(!p){ box.innerHTML='<div class="empty">Məhsul tapılmadı. <a href="products.html">Məhsullara qayıt</a></div>'; return; }
  var name=p.name[lang]||p.name.az, desc=p.description[lang]||p.description.az||"", feats=p.features[lang]&&p.features[lang].length?p.features[lang]:(p.features.az||[]);
  var sel=p.prices[0].months;

  function render(){
    var cur=p.prices.find(function(x){return x.months===sel;});
    box.innerHTML =
      '<div class="grid" style="grid-template-columns:1fr">'+
      '<div class="card"><div class="img">'+(p.image_url?'<img src="'+esc(p.image_url)+'" alt="'+esc(name)+'" data-img>':'Şəkil yoxdur')+'</div></div>'+
      '<div class="card-box" style="margin-top:12px"><h1 style="font-size:22px;margin-bottom:6px">'+esc(name)+'</h1>'+
      '<p class="muted" style="margin-bottom:12px">'+esc(desc)+'</p>'+
      (feats.length?'<ul style="margin:0 0 14px 18px;color:var(--muted)">'+feats.map(function(f){return '<li>'+esc(f)+'</li>';}).join("")+'</ul>':'')+
      '<div class="field"><label>Müddət</label><div style="display:flex;gap:6px;flex-wrap:wrap">'+
        p.prices.map(function(x){return '<button class="btn '+(x.months===sel?'gold':'')+'" data-m="'+x.months+'">'+x.months+' ay</button>';}).join("")+
      '</div></div>'+
      '<p class="price" style="font-size:22px;margin:10px 0">'+cur.price.toFixed(2)+' AZN</p>'+
      '<button class="btn gold" id="addBtn" style="width:100%">'+DB.t("add")+'</button>'+
      '<p class="ok" id="addOk"></p></div></div>';
    box.querySelectorAll("img[data-img]").forEach(function(im){ im.addEventListener("error",function(){ im.replaceWith(document.createTextNode("Şəkil yoxdur")); }); });
    box.querySelectorAll("[data-m]").forEach(function(b){ b.onclick=function(){ sel=Number(b.dataset.m); render(); }; });
    document.getElementById("addBtn").onclick=function(){
      DB.cart.add(p.product_key, sel);
      document.getElementById("addOk").textContent="Səbətə əlavə olundu.";
    };
  }
  document.title=name+" — DigiBaku";
  render();
})();

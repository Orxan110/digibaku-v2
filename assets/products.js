function attachImgFallback(root){ root.querySelectorAll('img[data-img]').forEach(function(im){ im.addEventListener('error',function(){ im.replaceWith(document.createTextNode('Şəkil yoxdur')); }); }); }
(async function(){
  var lang=DB.lang, grid=document.getElementById("productGrid"), bar=document.getElementById("catBar");
  var params=new URLSearchParams(location.search), cat=params.get("cat")||"", q=(params.get("q")||"").toLowerCase();
  var r=await DBApi.get("/api/products");
  if(!r.ok){ grid.innerHTML='<div class="empty">Məhsullar yüklənmədi.</div>'; return; }
  var cats=r.data.categories||[], items=r.data.products||[];
  function label(o){ return o["name_"+lang]||o.name_az||o.name||""; }

  bar.innerHTML = '<a class="btn '+(!cat?'gold':'')+'" href="products.html">Hamısı</a>' +
    cats.map(function(c){ return '<a class="btn '+(cat===c.key?'gold':'')+'" href="products.html?cat='+encodeURIComponent(c.key)+'">'+esc(label(c))+'</a>'; }).join("");

  var catName={}; cats.forEach(function(c){ catName[c.key]=label(c); });
  var list=items.filter(function(p){
    if(cat && p.category_key!==cat) return false;
    if(q && [p.name.az,p.name.ru,p.name.en].join(' ').toLowerCase().indexOf(q)<0) return false;
    return true;
  });
  if(!list.length){ grid.innerHTML='<div class="empty">'+DB.t("empty")+'</div>'; return; }

  grid.innerHTML=list.map(function(p){
    var min=Math.min.apply(null,p.prices.map(function(x){return x.price;}));
    var img=p.image_url
      ? '<img src="'+esc(p.image_url)+'" alt="'+esc(p.name.az)+'" loading="lazy" data-img>'
      : 'Şəkil yoxdur';
    return '<div class="card"><div class="img">'+img+'</div><div class="body">'+
      '<span class="cat-label">'+esc(catName[p.category_key]||"")+'</span>'+
      '<h3>'+esc(p.name[lang]||p.name.az)+'</h3>'+
      '<span class="price">'+DB.t("from")+' '+min.toFixed(2)+' AZN</span>'+
      '<div class="actions"><a class="btn" href="product.html?slug='+encodeURIComponent(p.slug)+'">'+DB.t("details")+'</a></div>'+
      '</div></div>';
  }).join("");
  attachImgFallback(grid);
})();

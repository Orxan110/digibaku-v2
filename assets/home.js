(async function(){
  var box=document.getElementById("homeCats");
  var r=await DBApi.get("/api/products");
  if(!r.ok){ box.innerHTML='<div class="empty">Kateqoriyalar yüklənmədi.</div>'; return; }
  var cats=r.data.categories||[];
  if(!cats.length){ box.innerHTML='<div class="empty">Hələ kateqoriya yoxdur.</div>'; return; }
  var lang=DB.lang;
  box.innerHTML=cats.map(function(c){
    var name=c["name_"+lang]||c.name_az;
    return '<a class="cat" href="products.html?cat='+encodeURIComponent(c.key)+'">'+esc(name)+'</a>';
  }).join("");
})();

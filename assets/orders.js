(async function(){
  var box=document.getElementById("ordersBox");
  if(new URLSearchParams(location.search).get("created")){
    box.insertAdjacentHTML("beforebegin",'<div class="ok">Sifarişiniz qəbul olundu. Status: gözləyir.</div>');
  }
  var r=await DBApi.get("/api/orders");
  if(r.status===401){ box.innerHTML='<div class="empty">Sifarişləri görmək üçün <a href="login.html?next=orders.html">daxil olun</a>.</div>'; return; }
  if(!r.ok){ box.innerHTML='<div class="empty">Sifarişlər yüklənmədi.</div>'; return; }
  var orders=r.data.orders||[];
  if(!orders.length){ box.innerHTML='<div class="empty">Hələ sifarişiniz yoxdur.</div>'; return; }
  var label={pending:"Cavab gözləyir",confirmed:"Təsdiqləndi",processing:"Hazırlanır",completed:"Hazırdır",cancelled:"Ləğv edildi"};
  box.innerHTML=orders.map(function(o){
    var items=(o.items||[]).map(function(i){return esc(i.name)+" · "+i.months+" ay × "+i.qty;}).join("<br>");
    var dlv=o.delivery_info?'<div style="margin-top:10px;padding:10px 12px;border:1px solid #d4af37;border-radius:12px;background:#111"><b>🔑 Hesab məlumatı</b><pre style="white-space:pre-wrap;word-break:break-all;margin:8px 0;font:inherit">'+esc(o.delivery_info)+'</pre><button type="button" class="btn" data-cp="1">📋 Kopyala</button></div>':'';
    return '<div class="card-box" style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;gap:8px"><b>#'+esc(String(o.id).slice(0,8))+'</b><span class="price">'+Number(o.total).toFixed(2)+' AZN</span></div>'+
      '<p class="muted" style="font-size:13px">'+new Date(o.created_at).toLocaleString("az-AZ")+'</p>'+
      '<p style="margin:6px 0">'+items+'</p><p>Status: <b>'+esc(label[o.status]||o.status)+'</b></p>'+dlv+'</div>';
  }).join("");
  box.onclick=function(e){
    var b=e.target.closest("[data-cp]"); if(!b) return;
    var t=b.parentNode.querySelector("pre").textContent;
    var p=navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject();
    p.then(function(){b.textContent="✅ Kopyalandı";},function(){b.textContent="Mətni seçib kopyalayın";});
  };
})();

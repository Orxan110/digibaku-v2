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
  var label={pending:"Gözləyir",confirmed:"Ödənilib",processing:"Hazırlanır",completed:"Təhvil verildi",cancelled:"Ləğv edildi"};
  var STEP=5, shown=STEP;
  var stCol={pending:"#facc15",confirmed:"#60a5fa",processing:"#60a5fa",completed:"#4ade80",cancelled:"#f87171"};
  var st=document.createElement("style");
  st.textContent=".ord{background:var(--card);border:1px solid var(--line);border-radius:14px;margin-bottom:8px;overflow:hidden}"+
    ".ord-h{display:flex;align-items:center;gap:8px;padding:11px 14px;cursor:pointer;-webkit-tap-highlight-color:transparent}"+
    ".ord-m{flex:1;min-width:0}"+
    ".ord-t{display:flex;justify-content:space-between;gap:8px;font-size:14px}"+
    ".ord-s{font-size:13px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:3px}"+
    ".ord-st{font-size:12px;font-weight:700;margin-top:3px}"+
    ".ord-ar{color:var(--muted);font-size:12px;transition:transform .2s}"+
    ".ord.open .ord-ar{transform:rotate(180deg)}"+
    ".ord-d{display:none;padding:0 14px 12px;border-top:1px solid var(--line)}"+
    ".ord.open .ord-d{display:block}"+
    ".ord-more{display:flex;justify-content:center;gap:8px;margin:12px 0}";
  document.head.appendChild(st);
  function card(o,idx){
    var its=o.items||[];
    var items=its.map(function(i){return esc(i.name)+" · "+i.months+" ay × "+i.qty;}).join("<br>");
    var sum=its.length?(esc(its[0].name)+(its.length>1?" +"+(its.length-1):"")):"";
    var dlv=o.delivery_info?'<div style="margin-top:10px;padding:10px 12px;border:1px solid #d4af37;border-radius:12px;background:#111"><b>🔑 Hesab məlumatı</b><pre style="white-space:pre-wrap;word-break:break-all;margin:8px 0;font:inherit">'+esc(o.delivery_info)+'</pre><button type="button" class="btn" data-cp="1">📋 Kopyala</button></div>':'';
    var d=new Date(o.created_at).toLocaleString("az-AZ");
    return '<div class="ord'+(o.delivery_info?' open':'')+'" data-i="'+idx+'"><div class="ord-h" data-tg="1"><div class="ord-m">'+
      '<div class="ord-t"><b>#'+esc(String(o.id).slice(0,8))+'</b><span class="price">'+Number(o.total).toFixed(2)+' AZN</span></div>'+
      '<div class="ord-s">'+sum+'</div>'+
      '<div class="ord-st" style="color:'+(stCol[o.status]||"var(--muted)")+'">'+esc(label[o.status]||o.status)+(o.delivery_info?' · 🔑':'')+' <span class="muted" style="font-weight:400">· '+d+'</span></div>'+
      '</div><span class="ord-ar">▼</span></div>'+
      '<div class="ord-d"><p style="margin:8px 0">'+items+'</p>'+
      (Number(o.discount_amount)>0?'<p class="muted" style="font-size:13px">Kupon '+esc(o.coupon_code||'')+': −'+Number(o.discount_amount).toFixed(2)+' AZN</p>':'')+
      (Number(o.balance_used)>0?'<p class="muted" style="font-size:13px">Balansdan: −'+Number(o.balance_used).toFixed(2)+' AZN</p>':'')+dlv+'</div></div>';
  }
  function render(){
    var html=orders.slice(0,shown).map(card).join("");
    if(orders.length>STEP){
      html+='<div class="ord-more">'+
        (shown<orders.length?'<button type="button" class="btn" data-more="1">Daha çox göstər ('+(orders.length-shown)+')</button>':'')+
        (shown>STEP?'<button type="button" class="btn ghost" data-less="1">Daha az göstər</button>':'')+'</div>';
    }
    box.innerHTML=html;
  }
  render();
  box.onclick=function(e){
    if(e.target.closest("[data-more]")){ shown=Math.min(orders.length,shown+STEP); render(); return; }
    if(e.target.closest("[data-less]")){ shown=STEP; render(); return; }
    var h=e.target.closest("[data-tg]");
    if(h && !e.target.closest("[data-cp]")){ h.parentNode.classList.toggle("open"); return; }
    var b=e.target.closest("[data-cp]"); if(!b) return;
    var t=b.parentNode.querySelector("pre").textContent;
    var p=navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject();
    p.then(function(){b.textContent="✅ Kopyalandı";},function(){b.textContent="Mətni seçib kopyalayın";});
  };
})();

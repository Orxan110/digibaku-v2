(async function(){
  var box=document.getElementById("faqList"), lang=DB.lang;
  var r=await DBApi.get("/api/faq");
  if(!r.ok){ box.innerHTML='<div class="empty">FAQ yüklənmədi.</div>'; return; }
  var list=(r.data.faqs||[]).filter(function(f){return f.language===lang;});
  if(!list.length) list=(r.data.faqs||[]).filter(function(f){return f.language==="az";});
  if(!list.length){ box.innerHTML='<div class="empty">Hələ sual yoxdur.</div>'; return; }
  box.innerHTML=list.map(function(f){ return '<details><summary>'+esc(f.question)+'</summary><p>'+esc(f.answer)+'</p></details>'; }).join("");
})();

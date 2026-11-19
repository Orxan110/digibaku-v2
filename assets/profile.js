(async function(){
  var box=document.getElementById("profileBox");
  var r=await DigiAuth.getSession();
  if(!r.session){ box.innerHTML='<div class="empty">Profilə baxmaq üçün <a href="login.html?next=profile.html">daxil olun</a>.</div>'; return; }
  var u=r.session.user;
  box.innerHTML='<p><b>Ad:</b> '+esc(u.name||"-")+'</p><p><b>E-poçt:</b> '+esc(u.email||"-")+'</p>'+
    '<p style="margin:14px 0"><a class="btn" href="orders.html">Sifarişlərim</a></p>'+
    '<button class="btn" id="logoutBtn">Çıxış</button>';
  document.getElementById("logoutBtn").onclick=async function(){ await DigiAuth.logout(); location.href="index.html"; };
})();

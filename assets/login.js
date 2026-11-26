(function(){
  var params=new URLSearchParams(location.search);
  var mode=params.get("mode")==="register"?"register":"login";
  var next=params.get("next")||"profile.html";
  var form=document.getElementById("authForm"), err=document.getElementById("authErr"), ok=document.getElementById("authOk");
  var btn=document.getElementById("authBtn");

  function setMode(m){
    mode=m;
    document.getElementById("tabLogin").className="btn"+(m==="login"?" gold":"");
    document.getElementById("tabRegister").className="btn"+(m==="register"?" gold":"");
    document.getElementById("nameField").style.display=m==="register"?"flex":"none";
    btn.textContent=m==="register"?"Qeydiyyatdan keçin":"Daxil ol";
    document.getElementById("password").autocomplete=m==="register"?"new-password":"current-password";
    err.textContent=""; ok.textContent="";
  }
  document.getElementById("tabLogin").onclick=function(){setMode("login");};
  document.getElementById("tabRegister").onclick=function(){setMode("register");};

  // Yalnız açıq (open-redirect olmasın) daxili yol qəbul olunur
  function safeNext(n){ return /^[a-z0-9_\-]+\.html(\?[a-z0-9=&_\-%]*)?$/i.test(n) ? n : "profile.html"; }

  form.onsubmit=async function(e){
    e.preventDefault();
    err.textContent=""; ok.textContent="";
    var email=document.getElementById("email").value, password=document.getElementById("password").value;
    btn.disabled=true;
    var r;
    if(mode==="register"){
      r=await DigiAuth.register({name:document.getElementById("name").value,email:email,password:password});
    } else {
      r=await DigiAuth.login({email:email,password:password});
    }
    btn.disabled=false;
    if(!r.ok){ err.textContent=r.error; return; }
    ok.textContent=r.message;
    setTimeout(function(){ location.href=safeNext(next); }, 700);
  };

  document.getElementById("forgot").onclick=async function(e){
    e.preventDefault();
    err.textContent=""; ok.textContent="";
    var r=await DigiAuth.requestPasswordReset({email:document.getElementById("email").value});
    if(!r.ok) err.textContent=r.error; else ok.textContent=r.message;
  };
  setMode(mode);

  // Şifrə bərpa linkindən gəlibsə (?token=...) yeni şifrə formu göstərilir
  var rtoken=params.get("token");
  if(rtoken||params.get("error")){
    document.getElementById("tabLogin").parentNode.style.display="none";
    form.style.display="none";
    document.getElementById("forgot").parentNode.style.display="none";
    var box=document.createElement("div");
    if(!rtoken){
      box.innerHTML='<p class="err">Bərpa linki etibarsızdır və ya vaxtı bitib. Yenidən sorğu göndərin.</p><p style="text-align:center"><a class="btn gold" href="login.html">Girişə qayıt</a></p>';
    } else {
      box.innerHTML='<h2 style="margin:0 0 12px;font-size:18px">Yeni şifrə təyin edin</h2>'+
        '<div class="field"><label for="np1">Yeni şifrə (ən azı 8 simvol)</label><input id="np1" type="password" autocomplete="new-password"></div>'+
        '<div class="field"><label for="np2">Şifrəni təkrarlayın</label><input id="np2" type="password" autocomplete="new-password"></div>'+
        '<div class="err" id="npErr"></div><div class="ok" id="npOk"></div>'+
        '<button class="btn gold" type="button" id="npBtn" style="width:100%">Şifrəni yenilə</button>';
    }
    form.parentNode.insertBefore(box,form);
    var nb=document.getElementById("npBtn");
    if(nb) nb.onclick=async function(){
      var e1=document.getElementById("npErr"), o1=document.getElementById("npOk");
      e1.textContent=""; o1.textContent="";
      var a=document.getElementById("np1").value, b=document.getElementById("np2").value;
      if(a!==b){ e1.textContent="Şifrələr eyni deyil."; return; }
      nb.disabled=true;
      var r=await DigiAuth.resetPassword({token:rtoken,newPassword:a});
      nb.disabled=false;
      if(!r.ok){ e1.textContent=r.error; return; }
      o1.textContent=r.message;
      setTimeout(function(){ location.href="login.html"; }, 1500);
    };
  }
})();

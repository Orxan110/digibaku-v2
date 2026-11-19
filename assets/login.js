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
})();

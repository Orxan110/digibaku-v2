window.DBApi = {

async get(url){ const r = await fetch(url,{credentials:"include"}); const j = await r.json().catch(()=>({})); return {ok:r.ok, status:r.status, data:j}; },

async post(url, body){ const r = await fetch(url,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}); const j = await r.json().catch(()=>({})); return {ok:r.ok, status:r.status, data:j}; }

};


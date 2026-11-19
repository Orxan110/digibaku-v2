window.DBApi = {
  async authHeaders() {
    var h = {};
    if (window.DigiAuth && DigiAuth.getToken) {
      var t = await DigiAuth.getToken();
      if (t) h.Authorization = "Bearer " + t;
    }
    return h;
  },
  async get(url) {
    var h = await this.authHeaders();
    var r = await fetch(url, { credentials: "include", headers: h });
    var j = await r.json().catch(function () { return {}; });
    return { ok: r.ok, status: r.status, data: j };
  },
  async post(url, body) {
    var h = await this.authHeaders();
    h["Content-Type"] = "application/json";
    var r = await fetch(url, { method: "POST", credentials: "include", headers: h, body: JSON.stringify(body) });
    var j = await r.json().catch(function () { return {}; });
    return { ok: r.ok, status: r.status, data: j };
  }
};

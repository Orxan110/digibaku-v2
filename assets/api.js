window.DBApi = {
  async authHeaders(url) {
    var h = {};
    // Yalnız şəxsi endpointlər üçün token alınır (məhsullar gözləmir)
    if (url.indexOf("/api/orders") !== 0) return h;
    try {
      if (window.DigiAuth && DigiAuth.getToken) {
        var t = await DigiAuth.getToken();
        if (t) h.Authorization = "Bearer " + t;
      }
    } catch (e) {}
    return h;
  },
  async get(url) {
    try {
      var h = await this.authHeaders(url);
      var r = await fetch(url, { credentials: "include", headers: h });
      var j = await r.json().catch(function () { return {}; });
      return { ok: r.ok, status: r.status, data: j };
    } catch (e) {
      return { ok: false, status: 0, data: { error: String(e && e.message || e) } };
    }
  },
  async post(url, body) {
    try {
      var h = await this.authHeaders(url);
      h["Content-Type"] = "application/json";
      var r = await fetch(url, { method: "POST", credentials: "include", headers: h, body: JSON.stringify(body) });
      var j = await r.json().catch(function () { return {}; });
      return { ok: r.ok, status: r.status, data: j };
    } catch (e) {
      return { ok: false, status: 0, data: { error: String(e && e.message || e) } };
    }
  }
};

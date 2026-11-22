window.DBApi = {
  // Giriş tələb edən endpointlər: sifarişlər və rəy göndərmə
  isPrivate(url) {
    return url.indexOf("/api/orders") === 0 || /^\/api\/shop\?(?:.*&)?action=review(?:&|$)/.test(url);
  },
  async authHeaders(url) {
    var h = {};
    // Yalnız şəxsi endpointlər üçün token alınır (məhsullar gözləmir)
    if (!this.isPrivate(url)) return h;
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
  // Keşdən dərhal göstər, arxa planda yenilə (sayt tez açılsın deyə)
  // cb(data, fromCache). Server cavab verməsə və keş yoxdursa cb(null, false).
  swr(url, cb) {
    var self = this, key = "digibaku_c1:" + url, cachedTxt = null;
    try { cachedTxt = localStorage.getItem(key); } catch (e) {}
    if (cachedTxt) {
      try { cb(JSON.parse(cachedTxt), true); } catch (e) { cachedTxt = null; }
    }
    return self.get(url).then(function (r) {
      if (r.ok && r.data && r.data.ok !== false) {
        var txt = JSON.stringify(r.data);
        if (txt !== cachedTxt) cb(r.data, false);
        try { localStorage.setItem(key, txt); } catch (e) {}
      } else if (!cachedTxt) {
        cb(null, false);
      }
      return r;
    });
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

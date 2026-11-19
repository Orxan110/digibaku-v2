/* DigiBaku — API client */
(function () {

  async function getHeaders() {
    const headers = {};

    try {
      if (window.DigiAuth && typeof DigiAuth.getJWTToken === "function") {
        const token = await DigiAuth.getJWTToken();

        if (token) {
          headers.Authorization = "Bearer " + token;
        }
      }
    } catch (error) {
      console.error("API token xətası:", error);
    }

    return headers;
  }

  window.DBApi = {

    async get(url) {
      const headers = await getHeaders();

      const r = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers
      });

      const j = await r.json().catch(() => ({}));

      return {
        ok: r.ok,
        status: r.status,
        data: j
      };
    },

    async post(url, body) {
      const headers = await getHeaders();

      headers["Content-Type"] = "application/json";

      const r = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify(body)
      });

      const j = await r.json().catch(() => ({}));

      return {
        ok: r.ok,
        status: r.status,
        data: j
      };
    }

  };

})();

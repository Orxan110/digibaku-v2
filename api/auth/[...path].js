const AUTH_ORIGIN =
  "https://ep-lively-math-betoma1f.neonauth.c-9.us-east-2.aws.neon.tech";

module.exports = async function handler(req, res) {
  try {
    const path = Array.isArray(req.query.path)
      ? req.query.path.join("/")
      : req.query.path || "";

    const queryIndex = req.url.indexOf("?");
    const query = queryIndex >= 0 ? req.url.slice(queryIndex) : "";

    const target =
      `${AUTH_ORIGIN}/neondb/auth/${path}${query}`;

    const headers = {
      "Content-Type": req.headers["content-type"] || "application/json",
      "Cookie": req.headers.cookie || "",
      "Origin": `https://${req.headers.host}`,
      "X-Forwarded-Host": req.headers.host,
      "X-Forwarded-Proto": "https"
    };

    const options = {
      method: req.method,
      headers,
      redirect: "manual"
    };

    if (!["GET", "HEAD"].includes(req.method)) {
      options.body =
        typeof req.body === "string"
          ? req.body
          : JSON.stringify(req.body || {});
    }

    const response = await fetch(target, options);

    const cookies = response.headers.getSetCookie
      ? response.headers.getSetCookie()
      : [];

    if (cookies.length) {
      res.setHeader(
        "Set-Cookie",
        cookies.map(cookie =>
          cookie.replace(/;\s*Domain=[^;]+/gi, "")
        )
      );
    }

    const contentType = response.headers.get("content-type");
    if (contentType) {
      res.setHeader("Content-Type", contentType);
    }

    const location = response.headers.get("location");
    if (location) {
      res.setHeader("Location", location);
    }

    const data = await response.arrayBuffer();

    res.status(response.status).send(Buffer.from(data));

  } catch (error) {
    console.error("Neon Auth proxy error:", error);

    res.status(500).json({
      ok: false,
      error: "Auth server error"
    });
  }
};

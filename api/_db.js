const { Pool } = require("pg");
const { createRemoteJWKSet, jwtVerify } = require("jose");

const pool = globalThis.digibakuPool || new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
  idleTimeoutMillis: 20000,
  connectionTimeoutMillis: 8000
});

globalThis.digibakuPool = pool;

const AUTH_BASE = process.env.NEON_AUTH_URL ||
  "https://ep-lively-math-betoma1f.neonauth.c-9.us-east-2.aws.neon.tech/neondb/auth";

const JWKS_URL = process.env.NEON_AUTH_JWKS_URL ||
  AUTH_BASE.replace(/\/$/, "") + "/.well-known/jwks.json";

const ISSUER = new URL(AUTH_BASE).origin;

const JWKS = createRemoteJWKSet(new URL(JWKS_URL));

async function getUserId(req) {
  try {
    const authorization = req.headers.authorization || "";

    if (!authorization.toLowerCase().startsWith("bearer ")) {
      return null;
    }

    const token = authorization.slice(7).trim();

    if (!token) return null;

    const { payload } = await jwtVerify(token, JWKS, {
      issuer: ISSUER,
      algorithms: ["EdDSA"]
    });

    if (!payload.sub || typeof payload.sub !== "string") {
      return null;
    }

    return payload.sub;

  } catch (error) {
    console.error("JWT yoxlama xətası:", error.message);
    return null;
  }
}

module.exports = {
  pool,
  getUserId
};

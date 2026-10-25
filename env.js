const path = require("node:path");
const dotenv = require("dotenv");
const { validateMongoUrl } = require("./lib/mongo-config");

function loadConfig(overrides = {}) {
  dotenv.config({ path: path.join(__dirname, ".env"), quiet: true });
  const env = { ...process.env, ...overrides };
  const production = env.NODE_ENV === "production";
  const port = Number(env.PORT || 4444);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be between 1 and 65535.");
  if (!env.JWT_SECRET) throw new Error("Set JWT_SECRET in the backend .env, or use npm run dev:local.");
  if (production && env.JWT_SECRET.length < 32) throw new Error("Production JWT_SECRET must contain at least 32 characters.");
  const origins = (env.CORS_ORIGIN || "http://localhost:5173,http://127.0.0.1:5173").split(",").map(value => value.trim()).filter(Boolean);
  for (const origin of origins) {
    const url = new URL(origin);
    if (!["http:", "https:"].includes(url.protocol) || url.origin !== origin) throw new Error("CORS_ORIGIN must contain comma-separated HTTP(S) origins without paths.");
  }
  return {
    production, port, host: env.HOST || "127.0.0.1",
    mongoUrl: validateMongoUrl(env.MONGOURL || "mongodb://127.0.0.1:27017/quizzo_db"),
    jwtSecret: env.JWT_SECRET, jwtTtl: env.JWT_TTL || "7d",
    origins, trustProxy: env.TRUST_PROXY === "1" ? 1 : false,
    authLimit: 40,
    serveFrontend: env.SERVE_FRONTEND === "true" || (production && env.SERVE_FRONTEND !== "false"),
    frontendDir: path.resolve(__dirname, "../quizzo_frontend/dist"),
  };
}
module.exports = { loadConfig };

const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { authRateLimit } = require("./middlewares/authRateLimit");
const { HttpError, errorHandler } = require("./lib/errors");

function createApp(config) {
  const app = express();
  app.locals.config = config;
  app.disable("x-powered-by");
  app.set("trust proxy", config.trustProxy || false);
  app.use(cors((req, callback) => {
    const origin = req.get("Origin");
    const sameOrigin = origin === `${req.protocol}://${req.get("Host")}`;
    if (origin && !sameOrigin && !config.origins.includes(origin)) {
      return callback(new HttpError(403, "This browser origin is not allowed."));
    }
    callback(null, {
      origin: true,
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key"],
    });
  }));
  app.use((req, res, next) => {
    res.set("X-Content-Type-Options", "nosniff");
    if (req.path.startsWith("/api/")) res.set("Cache-Control", "no-store");
    next();
  });
  const authLimiter = authRateLimit({ limit: config.authLimit || 40 });
  app.use(["/api/auth/signup", "/api/auth/signin"], authLimiter);
  app.use(express.json({ limit: "6mb" }));
  app.get("/health", (req, res) => {
    const ready = mongoose.connection.readyState === 1;
    res.status(ready ? 200 : 503).json({ status: ready ? "ok" : "unavailable", database: ready ? "connected" : "disconnected" });
  });
  app.use("/api/auth", require("./routes/auth.routes"));
  app.use("/api/quizzes", require("./routes/quiz.routes"));
  app.use("/api/shared", require("./routes/shared.routes"));
  app.use("/api/attempts", require("./routes/attempt.routes"));
  app.use("/api", (req, res) => res.status(404).json({ error: "API endpoint not found." }));

  if (config.serveFrontend) {
    const index = path.join(config.frontendDir, "index.html");
    if (!fs.existsSync(index)) throw new Error("Build quizzo_frontend before enabling SERVE_FRONTEND.");
    app.use(express.static(config.frontendDir, { index: false }));
    app.get("/{*path}", (req, res) => res.set("Cache-Control", "no-cache").sendFile(index));
  } else {
    app.get("/", (req, res) => res.json({ service: "Quizly API", health: "/health" }));
  }
  app.use((req, res) => res.status(404).json({ error: "Endpoint not found." }));
  app.use(errorHandler);
  return app;
}
module.exports = { createApp };

if (require.main === module) {
  const { loadConfig } = require("./env");
  const { startServer, installShutdown } = require("./server");
  Promise.resolve().then(() => loadConfig()).then(startServer).then(installShutdown).catch(error => {
    if (error.name === "ConfigError") console.error("Backend startup failed:", error.message);
    else console.error("Backend startup failed. Check environment configuration, MongoDB availability, and the listening port.", { type: error.name });
    process.exitCode = 1;
  });
}

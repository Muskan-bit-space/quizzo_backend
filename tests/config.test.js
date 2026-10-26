const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loadConfig } = require("../env");
const { validateMongoUrl } = require("../lib/mongo-config");

test("startup rejects missing secrets, invalid ports/origins, and short production secrets", () => {
  const env = { NODE_ENV: "test", JWT_SECRET: "test-only-secret", MONGOURL: "mongodb://127.0.0.1:27017/quizly_test", PORT: "4444", CORS_ORIGIN: "http://localhost:5173", SERVE_FRONTEND: "false", TRUST_PROXY: "0" };
  for (const bad of [{ JWT_SECRET: "" }, { PORT: "0" }, { PORT: "abc" }, { PORT: "65536" },
    { CORS_ORIGIN: "http://localhost:5173/path" }, { NODE_ENV: "production", JWT_SECRET: "short" }]) {
    assert.throws(() => loadConfig({ ...env, ...bad }));
  }
  const config = loadConfig(env);
  assert.equal(config.port, 4444);
  assert.equal(config.trustProxy, false);
  assert.deepEqual(config.origins, ["http://localhost:5173"]);
  const production = loadConfig({ ...env, NODE_ENV: "production", JWT_SECRET: "x".repeat(40), SERVE_FRONTEND: "", TRUST_PROXY: "1" });
  assert.equal(production.serveFrontend, true);
  assert.equal(production.trustProxy, 1);
});

test("MongoDB configuration rejects literal/encoded Atlas credential placeholders without disclosing credentials", () => {
  for (const value of ["<db_password>", "%3Cdb_password%3E", "<password>"]) {
    assert.throws(() => validateMongoUrl(`mongodb+srv://sample:${value}@example.mongodb.net/app`), /still contains an Atlas/);
  }
  assert.throws(() => validateMongoUrl("mongodb+srv://%3Cdb_username%3E:sample@example.mongodb.net/app"), /still contains an Atlas/);
  assert.throws(() => validateMongoUrl("https://example.test"), /MongoDB connection string/);
  assert.throws(() => validateMongoUrl("mongodb://sample:private%ZZ@host/"), error => error.name === "ConfigError" && !error.message.includes("private"));
});

test("MongoDB configuration accepts local, Atlas, and replica-set seed-list URIs without connecting", () => {
  for (const uri of ["mongodb://127.0.0.1:27017/app", "mongodb+srv://sample:encoded%40secret@example.mongodb.net/app", "mongodb://host1:27017,host2:27017/app?replicaSet=rs0"]) {
    assert.equal(validateMongoUrl(uri), uri);
  }
});

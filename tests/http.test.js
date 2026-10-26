const { test } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const { createApp } = require("../app");
const { authRateLimit } = require("../middlewares/authRateLimit");
const jwt = require("jsonwebtoken");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const config = { origins: ["https://frontend.example"], jwtSecret: "test-only-secret", authLimit: 100, serveFrontend: false };
async function listen(t, overrides = {}) {
  const server = createApp({ ...config, ...overrides }).listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  return `http://127.0.0.1:${server.address().port}`;
}

test("HTTP errors finish with JSON and protected routes reject missing/invalid tokens", async t => {
  const base = await listen(t);
  for (const path of ["/api/auth/me", "/api/quizzes", "/api/shared/quizzes/sample", "/api/attempts/sample"]) {
    const response = await fetch(base + path);
    assert.equal(response.status, 401);
    assert.equal(typeof (await response.json()).error, "string");
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
  for (const token of ["garbage", jwt.sign({}, config.jwtSecret, { subject: "0123456789abcdef01234567", issuer: "quizly", audience: "quizly:web", expiresIn: -1 }),
    jwt.sign({}, config.jwtSecret, { subject: "wrong-id", issuer: "quizly", audience: "quizly:web" }),
    jwt.sign({}, config.jwtSecret, { subject: "0123456789abcdef01234567", issuer: "quizly", audience: "quizly:web", algorithm: "HS384" })]) {
    const response = await fetch(base + "/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(response.status, 401);
  }
  const badJson = await fetch(base + "/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
  assert.equal(badJson.status, 400);
  assert.match((await badJson.json()).error, /valid JSON/);
  const missing = await fetch(base + "/api/missing");
  assert.equal(missing.status, 404);
  assert.deepEqual(await missing.json(), { error: "API endpoint not found." });
  const health = await fetch(base + "/health");
  assert.equal(health.status, 503);
  assert.equal((await health.json()).database, "disconnected");
});

test("CORS allows configured and same-origin requests, including preflight", async t => {
  const base = await listen(t);
  for (const origin of [base, "https://frontend.example"]) {
    const response = await fetch(base + "/api/quizzes", { method: "OPTIONS", headers: {
      Origin: origin, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "authorization,idempotency-key,content-type",
    } });
    assert.equal(response.status, 204);
    assert.equal(response.headers.get("access-control-allow-origin"), origin);
    assert.match(response.headers.get("access-control-allow-headers"), /Idempotency-Key/);
    const post = await fetch(base + "/api/auth/signup", { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: "{}" });
    assert.equal(post.status, 400); // Reaches input validation, not a CORS rejection.
  }
  const rejected = await fetch(base + "/health", { headers: { Origin: "https://untrusted.example" } });
  assert.equal(rejected.status, 403);
});

test("account limiter responds through HTTP and ignores forged forwarding headers by default", async t => {
  const base = await listen(t, { authLimit: 2 });
  for (let index = 0; index < 3; index++) {
    const response = await fetch(base + "/api/auth/signin", { method: "POST", headers: {
      "Content-Type": "application/json", "X-Forwarded-For": `192.0.2.${index}`,
    }, body: "{}" });
    assert.equal(response.status, index < 2 ? 400 : 429);
    if (index === 2) assert.ok(Number(response.headers.get("retry-after")) > 0);
  }
});

test("limiter windows expire and client storage has a bounded capacity", () => {
  let time = 1000;
  const limit = authRateLimit({ limit: 2, maxClients: 1, windowMs: 1000, now: () => time });
  function hit(ip) {
    const response = { code: 200, set() {}, status(code) { this.code = code; return this; }, json() {} };
    limit({ method: "POST", ip }, response, () => {});
    return response.code;
  }
  assert.equal(hit("one"), 200);
  assert.equal(hit("one"), 200);
  assert.equal(hit("one"), 429);
  assert.equal(hit("two"), 429);
  time = 2001;
  assert.equal(hit("two"), 200);
});

test("production hosting supports direct shared/result links while API misses remain JSON", async t => {
  const frontendDir = fs.mkdtempSync(path.join(os.tmpdir(), "quizly-static-test-"));
  const index = path.join(frontendDir, "index.html");
  fs.writeFileSync(index, "<!doctype html><title>Quizly test</title><div id='root'></div>");
  t.after(() => { fs.unlinkSync(index); fs.rmdirSync(frontendDir); });
  const base = await listen(t, { serveFrontend: true, frontendDir });
  for (const route of ["/", "/auth/signin", "/q/shared-code", "/attempts/attempt-id/result"]) {
    const response = await fetch(base + route);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /text\/html/);
    assert.match(await response.text(), /Quizly test/);
  }
  assert.equal((await fetch(base + "/api/unknown")).status, 404);
  assert.equal((await fetch(base + "/api/quizzes")).status, 401);
});

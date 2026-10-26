const { test } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const { hashPassword, verifyPassword, verifyLegacyPassword } = require("../lib/passwords");
const { jwtmaker } = require("../controllers/jwt.maker.controller");

test("salted scrypt verifies passwords without storing or exposing plaintext", async () => {
  const password = "correct horse 🔒 battery";
  const a = await hashPassword(password);
  const b = await hashPassword(password);
  assert.notEqual(a, b);
  assert.ok(!a.includes(password));
  assert.equal(await verifyPassword(password, a), true);
  assert.equal(await verifyPassword("wrong password", a), false);
  assert.equal(await verifyPassword(password, "bad-hash"), false);
  assert.equal(await verifyPassword(password, undefined), false);
  assert.equal(verifyLegacyPassword("old", "old"), true);
  assert.equal(verifyLegacyPassword("new", "old"), false);
  assert.equal(verifyLegacyPassword("new", undefined), false);
});

test("tokens have bounded validity and bind the user ID, issuer, audience and algorithm", () => {
  const config = { jwtSecret: "test-only-secret-never-for-deployment", jwtTtl: "1h" };
  const id = "0123456789abcdef01234567";
  const token = jwtmaker(config, { _id: id, password: "never-include", email: "private@example.com" });
  const claims = jwt.verify(token, config.jwtSecret, { algorithms: ["HS256"], issuer: "quizly", audience: "quizly:web" });
  assert.equal(claims.sub, id);
  assert.equal(claims.exp - claims.iat, 3600);
  assert.equal(claims.email, undefined);
  assert.equal(claims.password, undefined);
  assert.throws(() => jwt.verify(token, "wrong-secret"));
  assert.throws(() => jwt.verify(token, config.jwtSecret, { audience: "different-app" }));
});

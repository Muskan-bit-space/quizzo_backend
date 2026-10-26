const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { once } = require("node:events");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const mongoose = require("mongoose");
const { createApp } = require("../../app");
const { connectDB, disconnectDB } = require("../../db");
const { User } = require("../../models/users.model");
const Quiz = require("../../models/quizzes.model");
const Attempt = require("../../models/attempts.model");
const { verifyPassword } = require("../../lib/passwords");

const password = "integration-only-password";
const quizBody = { title: "Integration: two questions", description: "Temporary automated test quiz", questions: [
  { text: "2 + 2?", options: ["4", "5"], correctOption: 0 },
  { text: "Capital of France?", options: ["Rome", "Paris", "Berlin"], correctOption: 1 },
] };
function privateFieldsAbsent(value) {
  const json = JSON.stringify(value);
  for (const field of ["correctOption", "snapshot", "passwordHash", "password", "emailCanonical"]) {
    assert.ok(!json.includes(`"${field}"`), `Unexpected private field: ${field}`);
  }
}

test("real MongoDB + HTTP + frontend adapter workflow", { timeout: 240000 }, async t => {
  const dbName = `quizly_test_${randomUUID().replaceAll("-", "")}`;
  let mongo, uri = process.env.TEST_MONGO_URL;
  if (!uri) {
    const MongoMemoryServer = require("../../scripts/local-mongo").localMongo();
    mongo = await MongoMemoryServer.create({ instance: { storageEngine: "wiredTiger", ip: "127.0.0.1" } });
    uri = mongo.getUri();
  }
  let server, vite;
  t.after(async () => {
    if (vite) await vite.close();
    if (server?.listening) await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
    try {
      // Only the randomly generated database belonging to this test is removed.
      if (mongoose.connection.readyState === 1 && mongoose.connection.name === dbName && /^quizly_test_[a-f0-9]{32}$/.test(dbName)) {
        await mongoose.connection.dropDatabase();
      }
    } finally {
      await disconnectDB();
      if (mongo) await mongo.stop();
    }
  });
  try { await connectDB(uri, { dbName }); }
  catch (error) {
    // Diagnose connection/permission failures without printing a URI or credentials.
    const codes = [error.code, error.cause?.code, ...[...(error.reason?.servers?.values() || [])].map(server => server.error?.cause?.code || server.error?.code)];
    const code = codes.find(value => value !== undefined) || "unknown";
    throw new Error(`Could not connect/index the isolated test database (${error.name}, code ${code}). Check Atlas network access, database-user permissions, and the saved URI.`);
  }
  const config = { origins: [], jwtSecret: randomUUID(), jwtTtl: "1h", authLimit: 200, serveFrontend: false };
  async function serve() {
    server = createApp(config).listen(0, "127.0.0.1");
    await once(server, "listening");
    return `http://127.0.0.1:${server.address().port}`;
  }
  let base = await serve();
  async function request(method, route, { token, body, key, expected = 200 } = {}) {
    const response = await fetch(base + route, { method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(key ? { "Idempotency-Key": key } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const data = await response.json();
    assert.equal(response.status, expected, `${method} ${route}: ${JSON.stringify(data)}`);
    return data;
  }
  const get = (route, token, expected = 200) => request("GET", route, { token, expected });
  const post = (route, body, token, expected = 200, key) => request("POST", route, { token, body, expected, key });
  let authApi, quizApi, owner, alice, bob, published, first, second;

  await t.test("frontend adapters register, sign in, restore profiles and publish a quiz", async () => {
    // Load the actual frontend modules with Vite's normal import.meta.env transform.
    // No demo adapter or browser storage participates in this workflow.
    const envKeys = ["VITE_API_URL", "VITE_DEMO_MODE"];
    const previous = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
    try {
      process.env.VITE_API_URL = base;
      process.env.VITE_DEMO_MODE = "false";
      const frontend = path.resolve(__dirname, "../../../quizzo_frontend");
      const { createServer } = await import(pathToFileURL(require.resolve("vite", { paths: [frontend] })).href);
      vite = await createServer({ root: frontend, configFile: false, mode: "integration", logLevel: "silent", server: { middlewareMode: true, watch: null }, appType: "custom" });
      authApi = (await vite.ssrLoadModule("/src/api/Auth_Handler.jsx")).default;
      quizApi = (await vite.ssrLoadModule("/src/api/Quiz_Handler.js")).default;
      for (const [name, email] of [["Quiz Owner", "owner@example.test"], ["Alice", "alice@example.test"], ["Bob", "bob@example.test"]]) {
        const response = await authApi.signup(email, password, name);
        privateFieldsAbsent(response);
        assert.equal(response.user.name, name);
      }
      owner = await authApi.signin("OWNER@EXAMPLE.TEST", password);
      alice = await authApi.signin("alice@example.test", password);
      bob = await authApi.signin("bob@example.test", password);
      const restored = await authApi.me(owner.token);
      assert.equal(restored.user.id, owner.user.id);
      privateFieldsAbsent(restored);
      const stored = await User.findById(owner.user.id).select("+passwordHash +password");
      assert.equal(stored.password, undefined);
      assert.equal(await verifyPassword(password, stored.passwordHash), true);
      published = (await quizApi.createQuiz({ ...quizBody, owner: bob.user.id }, owner.token)).quiz;
      assert.match(published.shareId, /^[A-Za-z0-9_-]{24}$/);
      assert.equal(published.attemptCount, 0);
      assert.equal(published.averageScore, null);
      assert.equal((await Quiz.findById(published.id)).owner.toString(), owner.user.id);
      assert.equal((await quizApi.getMyQuizzes(owner.token)).quizzes[0].id, published.id);
      assert.equal((await quizApi.getMyQuizzes(alice.token)).quizzes.length, 0);
      assert.equal((await get("/health")).database, "connected");
    } finally {
      for (const key of envKeys) if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key];
    }
  });

  await t.test("auth rejects wrong credentials, injection, duplicate accounts and short signup passwords", async () => {
    await post("/api/auth/signin", { email: "owner@example.test", password: "wrong" }, null, 401);
    await post("/api/auth/signin", { email: "unknown@example.test", password }, null, 401);
    await post("/api/auth/signin", { email: { $ne: null }, password }, null, 400);
    await post("/api/auth/signup", { email: " OWNER@example.test ", password, name: "Duplicate" }, null, 409);
    await post("/api/auth/signup", { email: "short@example.test", password: "short", name: "Short" }, null, 400);
    await post("/api/auth/signup", { email: "noname@example.test", password }, null, 400);
    const dup = { email: "concurrent@example.test", password, name: "Concurrent" };
    const statuses = await Promise.all([1, 2].map(async () => {
      const response = await fetch(base + "/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dup) });
      return response.status;
    }));
    assert.deepEqual(statuses.sort(), [201, 409]);
    assert.equal(await User.countDocuments({ email: dup.email }), 1);
  });

  await t.test("owner details/results are private; shared intros have no answer key", async () => {
    const detail = (await quizApi.getQuiz(published.id, owner.token)).quiz;
    assert.equal(detail.questions[0].correctOption, 0);
    for (const path of [`/api/quizzes/${published.id}`, `/api/quizzes/${published.id}/attempts`]) await get(path, alice.token, 403);
    const shared = await quizApi.getSharedQuiz(published.shareId, alice.token);
    assert.equal(shared.quiz.questionCount, 2);
    assert.equal(shared.quiz.questions, undefined);
    privateFieldsAbsent(shared);
    await get(`/api/shared/quizzes/${published.shareId}`, null, 401);
    await get("/api/shared/quizzes/nonexistent-code", alice.token, 404);
    await get("/api/quizzes/invalid-id", owner.token, 400);
    await get(`/api/quizzes/${new mongoose.Types.ObjectId()}`, owner.token, 404);
    await post("/api/quizzes", { ...quizBody, questions: [] }, owner.token, 400);
  });

  await t.test("concurrent start retries create one attempt while participants and retakes stay independent", async () => {
    await post(`/api/shared/quizzes/${published.shareId}/attempts`, {}, alice.token, 400);
    const attempts = await Promise.all(Array.from({ length: 5 }, () => quizApi.startAttempt(published.shareId, alice.token, "same-start-key")));
    first = attempts[0].attempt;
    assert.ok(attempts.every(({ attempt }) => attempt.id === first.id));
    assert.equal(await Attempt.countDocuments({ quizId: published.id }), 1);
    privateFieldsAbsent(first);
    assert.equal(first.participantName, "Alice");
    second = (await quizApi.startAttempt(published.shareId, bob.token, "same-start-key")).attempt;
    assert.notEqual(first.id, second.id);
    const retake = (await quizApi.startAttempt(published.shareId, alice.token, "new-start-key")).attempt;
    assert.notEqual(first.id, retake.id);
    assert.equal(await Attempt.countDocuments({ quizId: published.id }), 3);
    await get(`/api/attempts/${first.id}`, bob.token, 403);
    await get(`/api/attempts/${first.id}`, owner.token, 403);
    await post(`/api/attempts/${first.id}/submit`, { answers: [] }, bob.token, 403, "wrong-owner");
    assert.equal((await quizApi.getAttempts(published.id, owner.token)).attempts.length, 0);
  });

  await t.test("submissions reject missing/foreign/duplicate answers, invalid choices and noninteger indexes", async () => {
    const [a, b] = first.questions;
    const correct = [{ questionId: a.id, optionIndex: 0 }, { questionId: b.id, optionIndex: 1 }];
    for (const answers of [[], [correct[0]], [correct[0], correct[0]],
      [correct[0], { questionId: new mongoose.Types.ObjectId().toString(), optionIndex: 1 }],
      [correct[0], { questionId: b.id, optionIndex: 3 }],
      [correct[0], { questionId: b.id, optionIndex: "1" }],
      [correct[0], { questionId: b.id, optionIndex: -1 }]]) {
      await post(`/api/attempts/${first.id}/submit`, { answers }, alice.token, 400, "invalid-submit");
    }
    assert.equal((await Attempt.findById(first.id)).status, "in_progress");
    await post(`/api/attempts/${first.id}/submit`, { answers: correct }, alice.token, 400);
    const result = (await quizApi.submitAttempt(first.id, correct, alice.token)).attempt;
    privateFieldsAbsent(result);
    assert.equal(result.status, "submitted");
    assert.deepEqual(result.result, { score: 2, totalQuestions: 2, percentage: 100 });
    const replay = (await post(`/api/attempts/${first.id}/submit`, { answers: [], score: 999 }, alice.token, 200, "different-key")).attempt;
    assert.deepEqual(replay, result);
    assert.deepEqual((await quizApi.getAttempt(first.id, alice.token)).attempt, result);
  });

  await t.test("concurrent submissions finalize once using the original question snapshot", async () => {
    // Simulate an administrative edit outside Mongoose/API immutability checks.
    await Quiz.collection.updateOne({ _id: new mongoose.Types.ObjectId(published.id) }, { $set: { "questions.0.correctOption": 1 } });
    const [a, b] = second.questions;
    const oneCorrect = [{ questionId: a.id, optionIndex: 0 }, { questionId: b.id, optionIndex: 0 }];
    const result = (await post(`/api/attempts/${second.id}/submit`, { answers: oneCorrect, score: 999, result: { percentage: 100 } }, bob.token, 200, "server-grade")).attempt;
    assert.deepEqual(result.result, { score: 1, totalQuestions: 2, percentage: 50 });
    const retake = (await quizApi.startAttempt(published.shareId, alice.token, "race-submit-start")).attempt;
    const choices = [0, 1].map(index => retake.questions.map(question => ({ questionId: question.id, optionIndex: index })));
    const raced = await Promise.all(choices.map(answers => quizApi.submitAttempt(retake.id, answers, alice.token)));
    assert.deepEqual(raced[0].attempt, raced[1].attempt);
    const stored = await Attempt.findById(retake.id).select("+snapshot");
    assert.equal(stored.status, "submitted");
    const correctCount = stored.answers.filter(answer => stored.snapshot.find(q => q.id === String(answer.questionId)).correctOption === answer.optionIndex).length;
    assert.equal(stored.result.score, correctCount);
    const rows = (await quizApi.getAttempts(published.id, owner.token)).attempts;
    assert.equal(rows.length, 3);
    assert.equal(new Set(rows.map(row => row.id)).size, 3);
    assert.equal(new Set(rows.map(row => row.userId)).size, 2);
    assert.ok(rows.some(row => row.participantName === "Alice" && row.score === 2));
    assert.ok(rows.some(row => row.participantName === "Bob" && row.score === 1));
    const summary = (await quizApi.getMyQuizzes(owner.token)).quizzes[0];
    assert.equal(summary.attemptCount, 3);
    assert.equal(summary.averageScore, Math.round(rows.reduce((sum, row) => sum + row.percentage, 0) / rows.length));
  });

  await t.test("legacy accounts upgrade only after correct login and saved quizzes gain stable share IDs", async () => {
    const legacyId = new mongoose.Types.ObjectId();
    await User.collection.insertOne({ _id: legacyId, email: " Legacy@Example.Test ", password: "old", quizzes_created: [] });
    await post("/api/auth/signin", { email: "legacy@example.test", password: "wrong" }, null, 401);
    assert.equal((await User.collection.findOne({ _id: legacyId })).password, "old");
    const signed = await post("/api/auth/signin", { email: "legacy@example.test", password: "old" });
    assert.equal(signed.user.id, String(legacyId));
    privateFieldsAbsent(signed.user);
    const upgraded = await User.collection.findOne({ _id: legacyId });
    assert.equal(upgraded.password, undefined);
    assert.equal(upgraded.emailCanonical, "legacy@example.test");
    assert.equal(await verifyPassword("old", upgraded.passwordHash), true);
    await post("/api/auth/signin", { email: "legacy@example.test", password: "old" });
    const legacyQuiz = await Quiz.create({ ...quizBody, owner: legacyId });
    const list = await get("/api/quizzes", signed.token);
    const code = list.quizzes[0].shareId;
    assert.equal(list.quizzes[0].id, legacyQuiz.id);
    assert.match(code, /^[A-Za-z0-9_-]{24}$/);
    assert.equal((await get(`/api/quizzes/${legacyQuiz.id}`, signed.token)).quiz.shareId, code);
    await User.collection.insertMany([{ email: "dup@example.test", password: "one" }, { email: "DUP@example.test", password: "two" }]);
    await post("/api/auth/signin", { email: "dup@example.test", password: "one" }, null, 409);
    assert.equal(await User.countDocuments({ email: /^dup@example.test$/i }), 2);
  });

  await t.test("server restart and database reconnect preserve accounts, quizzes and final results", async () => {
    await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
    await disconnectDB();
    if (mongo) {
      await mongo.stop({ doCleanup: false });
      await mongo.start();
      uri = mongo.getUri();
    }
    await connectDB(uri, { dbName });
    base = await serve();
    const result = (await get(`/api/attempts/${first.id}`, alice.token)).attempt;
    assert.deepEqual(result.result, { score: 2, totalQuestions: 2, percentage: 100 });
    assert.equal((await get(`/api/quizzes/${published.id}/attempts`, owner.token)).attempts.length, 3);
    assert.equal((await get("/api/quizzes", owner.token)).quizzes[0].shareId, published.shareId);
    assert.equal((await get("/api/auth/me", owner.token)).user.id, owner.user.id);
  });
});

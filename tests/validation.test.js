const { test } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { quizInput, gradeAnswers, emailValue, passwordValue, requestKey } = require("../lib/validation");
const { publicAttempt, publicUser } = require("../lib/serializers");
const Quiz = require("../models/quizzes.model");
const { User } = require("../models/users.model");
const { newShareId } = require("../services/quizzes");

const input = () => ({ title: "  Tiny quiz ", description: " Try it ", questions: [
  { text: "One + one?", options: [" 2 ", "3"], correctOption: 0 },
  { text: "Largest?", options: ["1", "10", "100"], correctOption: 2 },
] });
const badRequest = error => error.status === 400;

test("quiz input trims and whitelists fields, rejecting invalid answer keys and choices", () => {
  const payload = quizInput({ ...input(), owner: "forged", shareId: "forged", score: 100 });
  assert.deepEqual(Object.keys(payload), ["title", "description", "questions"]);
  assert.equal(payload.title, "Tiny quiz");
  assert.deepEqual(payload.questions[0].options, ["2", "3"]);
  for (const body of [null, [], {}, { ...input(), questions: [] }, { ...input(), title: "x".repeat(151) },
    { ...input(), questions: [{ text: "Q", options: [" Same ", "same"], correctOption: 0 }] },
    { ...input(), questions: [{ text: "Q", options: ["A", "B"], correctOption: "0" }] },
    { ...input(), questions: [{ text: "Q", options: ["A", "B"], correctOption: 2 }] },
    { ...input(), description: {} }]) assert.throws(() => quizInput(body), badRequest);
});

test("grading uses stored question IDs and key, never a submitted score", () => {
  const quiz = new Quiz({ ...quizInput(input()), owner: new mongoose.Types.ObjectId() });
  const [first, second] = quiz.questions;
  const answers = [{ questionId: second.id, optionIndex: 0 }, { questionId: first.id.toUpperCase(), optionIndex: 0 }];
  const grade = gradeAnswers(quiz.questions, { answers, score: 999, percentage: 100 });
  assert.deepEqual(grade.result, { score: 1, totalQuestions: 2, percentage: 50 });
  assert.deepEqual(grade.answers, [{ questionId: first.id, optionIndex: 0 }, { questionId: second.id, optionIndex: 0 }]);
  const invalid = [[], [answers[0]], [answers[0], answers[0]],
    [answers[0], { questionId: new mongoose.Types.ObjectId().toString(), optionIndex: 0 }],
    [answers[0], { questionId: first.id, optionIndex: "0" }],
    [answers[0], { questionId: first.id, optionIndex: -1 }],
    [answers[0], { questionId: first.id, optionIndex: 2 }],
    [answers[0], { questionId: "not-an-id", optionIndex: 0 }],
  ];
  for (const value of invalid) assert.throws(() => gradeAnswers(quiz.questions, { answers: value }), badRequest);
});

test("participant serializers never expose the private answer key or password", () => {
  const quiz = new Quiz({ ...quizInput(input()), owner: new mongoose.Types.ObjectId() });
  const attempt = publicAttempt({ _id: new mongoose.Types.ObjectId(), quizId: quiz._id,
    quizTitle: quiz.title, shareId: "example-code", participantName: "Maya", status: "submitted",
    snapshot: quiz.questions, answers: [], startedAt: new Date(), completedAt: new Date(),
    result: { score: 1, totalQuestions: 2, percentage: 50 }, startRequestId: "private", userId: "private",
  });
  const json = JSON.stringify(attempt);
  for (const field of ["correctOption", "snapshot", "startRequestId", "userId"]) assert.ok(!json.includes(field));
  assert.deepEqual(Object.keys(attempt.questions[0]), ["id", "text", "options"]);
  assert.deepEqual(publicUser({ _id: "one", email: "one@example.com", password: "secret", passwordHash: "hash" }),
    { id: "one", email: "one@example.com", name: "one" });
});

test("account and request identifiers have strict input types", () => {
  assert.equal(emailValue(" Maya@Example.com "), "maya@example.com");
  for (const email of [null, { $ne: null }, "missing-at", "a@b", "a b@c.com"]) assert.throws(() => emailValue(email), badRequest);
  assert.throws(() => passwordValue("short", true), badRequest);
  assert.equal(passwordValue("short"), "short"); // Legacy login only.
  for (const key of [undefined, "", "white space", "x".repeat(129)]) assert.throws(() => requestKey({ get: () => key }), badRequest);
  assert.equal(requestKey({ get: () => "submit-abc:123" }), "submit-abc:123");
  const codes = new Set(Array.from({ length: 100 }, newShareId));
  assert.equal(codes.size, 100);
  assert.ok([...codes].every(code => /^[A-Za-z0-9_-]{24}$/.test(code)));
});

test("Mongoose rejects new unhashed accounts and invalid quiz answer indexes", async () => {
  await assert.rejects(new User({ email: "test@example.com", password: "plaintext" }).validate());
  const quiz = new Quiz({ ...input(), owner: new mongoose.Types.ObjectId() });
  await quiz.validate();
  quiz.questions[0].correctOption = 2;
  await assert.rejects(quiz.validate());
});

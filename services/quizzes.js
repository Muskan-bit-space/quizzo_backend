const { randomBytes } = require("node:crypto");
const Quiz = require("../models/quizzes.model");
const Attempt = require("../models/attempts.model");
const { HttpError } = require("../lib/errors");
const { requireId } = require("../lib/validation");
const newShareId = () => randomBytes(18).toString("base64url");

async function ensurePublished(quiz) {
  if (quiz.shareId) return quiz;
  // Upgrade old saved quizzes lazily, without replacing their content or IDs.
  const updated = await Quiz.findOneAndUpdate(
    { _id: quiz._id, $or: [{ shareId: { $exists: false } }, { shareId: null }, { shareId: "" }] },
    { $set: { shareId: newShareId(), publishedAt: quiz.createdAt || new Date() } },
    { new: true },
  ).lean();
  return updated || Quiz.findById(quiz._id).lean();
}
async function ownedQuiz(id, user) {
  requireId(id);
  const quiz = await Quiz.findById(id).lean();
  if (!quiz) throw new HttpError(404, "This quiz could not be found.");
  if (String(quiz.owner) !== String(user._id)) throw new HttpError(403, "Only the quiz owner can access these details.");
  return ensurePublished(quiz);
}
async function sharedQuiz(shareId) {
  if (!/^[A-Za-z0-9_-]{4,128}$/.test(shareId)) throw new HttpError(400, "Invalid quiz code.");
  const quiz = await Quiz.findOne({ shareId }).lean();
  if (!quiz) throw new HttpError(404, "This quiz link is unavailable. Check the code with its creator.");
  return quiz;
}
async function quizStats(ids) {
  if (!ids.length) return new Map();
  const rows = await Attempt.aggregate([
    { $match: { quizId: { $in: ids }, status: "submitted" } },
    { $group: { _id: "$quizId", count: { $sum: 1 }, average: { $avg: "$result.percentage" } } },
  ]);
  return new Map(rows.map(row => [String(row._id), row]));
}
module.exports = { newShareId, ensurePublished, ownedQuiz, sharedQuiz, quizStats };

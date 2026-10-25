const Quiz = require("../models/quizzes.model");
const Attempt = require("../models/attempts.model");
const { User } = require("../models/users.model");
const { quizInput } = require("../lib/validation");
const { quizSummary, publicQuestion, userName } = require("../lib/serializers");
const { newShareId, ensurePublished, ownedQuiz, sharedQuiz, quizStats } = require("../services/quizzes");

async function createQuiz(req, res) {
  const input = quizInput(req.body);
  const quiz = await Quiz.create({ ...input, owner: req.user._id, shareId: newShareId(), version: 1, publishedAt: new Date() });
  res.status(201).json({ message: "Quiz created successfully.", quiz: quizSummary(quiz, req.user) });
}
async function getMyQuizzes(req, res) {
  const saved = await Quiz.find({ owner: req.user._id }).sort({ createdAt: -1, _id: -1 }).lean();
  const quizzes = await Promise.all(saved.map(ensurePublished));
  const stats = await quizStats(quizzes.map(quiz => quiz._id));
  res.json({ quizzes: quizzes.map(quiz => quizSummary(quiz, req.user, stats.get(String(quiz._id)))) });
}
async function getQuiz(req, res) {
  const quiz = await ownedQuiz(req.params.quizId, req.user);
  const stats = await quizStats([quiz._id]);
  res.json({ quiz: {
    ...quizSummary(quiz, req.user, stats.get(String(quiz._id))),
    questions: quiz.questions.map(question => ({ ...publicQuestion(question), correctOption: question.correctOption })),
  } });
}
async function getAttempts(req, res) {
  const quiz = await ownedQuiz(req.params.quizId, req.user);
  const attempts = await Attempt.find({ quizId: quiz._id, status: "submitted" })
    .select("_id userId participantName result completedAt").sort({ completedAt: -1, _id: -1 }).lean();
  res.json({ attempts: attempts.map(attempt => ({
    id: String(attempt._id), userId: String(attempt.userId), participantName: attempt.participantName,
    score: attempt.result.score, totalQuestions: attempt.result.totalQuestions,
    percentage: attempt.result.percentage, completedAt: attempt.completedAt,
  })) });
}
async function getSharedQuiz(req, res) {
  const quiz = await sharedQuiz(req.params.shareId);
  const owner = await User.findById(quiz.owner).select("name email").lean();
  res.json({ quiz: { id: String(quiz._id), title: quiz.title, description: quiz.description || "",
    shareId: quiz.shareId, ownerName: userName(owner), questionCount: quiz.questions.length } });
}
module.exports = { createQuiz, getMyQuizzes, getQuiz, getAttempts, getSharedQuiz };

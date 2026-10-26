const Attempt = require("../models/attempts.model");
const { sharedQuiz } = require("../services/quizzes");
const { requestKey, requireId, gradeAnswers, bodyObject } = require("../lib/validation");
const { publicAttempt, userName } = require("../lib/serializers");
const { HttpError } = require("../lib/errors");

async function participantAttempt(id, user) {
  requireId(id);
  const attempt = await Attempt.findById(id).select("+snapshot");
  if (!attempt) throw new HttpError(404, "This attempt could not be found.");
  if (String(attempt.userId) !== String(user._id)) throw new HttpError(403, "This attempt belongs to another account.");
  return attempt;
}
async function startAttempt(req, res) {
  bodyObject(req.body);
  const startRequestId = requestKey(req);
  const quiz = await sharedQuiz(req.params.shareId);
  const identity = { quizId: quiz._id, userId: req.user._id, startRequestId };
  let attempt = await Attempt.findOne(identity).select("+snapshot");
  let created = false;
  if (!attempt) {
    try {
      attempt = await Attempt.create({
        ...identity, quizVersion: quiz.version || 1, quizTitle: quiz.title, shareId: quiz.shareId,
        participantName: userName(req.user),
        snapshot: quiz.questions.map(question => ({
          _id: question._id, text: question.text, options: [...question.options], correctOption: question.correctOption,
        })),
      });
      created = true;
    } catch (error) {
      if (error.code !== 11000) throw error;
      // A concurrent retry may have inserted the same unique start key.
      attempt = await Attempt.findOne(identity).select("+snapshot");
      if (!attempt) throw error;
    }
  }
  res.status(created ? 201 : 200).json({ attempt: publicAttempt(attempt) });
}
async function getAttempt(req, res) {
  res.json({ attempt: publicAttempt(await participantAttempt(req.params.attemptId, req.user)) });
}
async function submitAttempt(req, res) {
  requestKey(req);
  const attempt = await participantAttempt(req.params.attemptId, req.user);
  if (attempt.status === "submitted") return res.json({ attempt: publicAttempt(attempt) });
  const grade = gradeAnswers(attempt.snapshot, req.body);
  // One atomic document update wins. Answers, score, status and timestamp agree.
  const completed = await Attempt.findOneAndUpdate(
    { _id: attempt._id, userId: req.user._id, status: "in_progress" },
    { $set: { ...grade, status: "submitted", completedAt: new Date() } },
    { new: true, runValidators: true },
  ).select("+snapshot");
  const result = completed || await participantAttempt(attempt.id, req.user);
  res.json({ attempt: publicAttempt(result) });
}
module.exports = { startAttempt, getAttempt, submitAttempt };

const { Schema, model } = require("mongoose");
const questionSchema = require("./question.schema");
const attemptSchema = new Schema({
  quizId: { type: Schema.Types.ObjectId, ref: "Quiz", required: true, immutable: true },
  quizVersion: { type: Number, required: true, immutable: true },
  userId: { type: Schema.Types.ObjectId, ref: "user", required: true, immutable: true },
  participantName: { type: String, required: true, immutable: true },
  quizTitle: { type: String, required: true, immutable: true },
  shareId: { type: String, required: true, immutable: true },
  startRequestId: { type: String, required: true, maxlength: 128, immutable: true },
  // Private immutable snapshot ensures edits outside the API cannot regrade an attempt.
  snapshot: { type: [questionSchema], required: true, select: false, immutable: true },
  status: { type: String, enum: ["in_progress", "submitted"], default: "in_progress", required: true },
  answers: [{ _id: false, questionId: { type: Schema.Types.ObjectId, required: true }, optionIndex: { type: Number, required: true } }],
  result: {
    type: new Schema({
      score: { type: Number, required: true, min: 0 },
      totalQuestions: { type: Number, required: true, min: 1 },
      percentage: { type: Number, required: true, min: 0, max: 100 },
    }, { _id: false }),
    default: undefined,
  },
  startedAt: { type: Date, default: Date.now, immutable: true },
  completedAt: Date,
});
attemptSchema.index({ quizId: 1, userId: 1, startRequestId: 1 }, { unique: true });
attemptSchema.index({ quizId: 1, status: 1, completedAt: -1 });
attemptSchema.index({ userId: 1, startedAt: -1 });
module.exports = model("Attempt", attemptSchema);

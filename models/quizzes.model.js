const { Schema, model } = require("mongoose");
const questionSchema = require("./question.schema");
const quizSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 150, immutable: true },
  description: { type: String, trim: true, maxlength: 2000, default: "", immutable: true },
  questions: {
    type: [questionSchema], required: true, immutable: true,
    validate: { validator: questions => questions.length >= 1 && questions.length <= 200, message: "Use 1–200 questions." },
  },
  owner: { type: Schema.Types.ObjectId, ref: "user", required: true, immutable: true },
  shareId: { type: String },
  version: { type: Number, default: 1, min: 1, immutable: true },
  publishedAt: Date,
}, { timestamps: true });
quizSchema.index({ shareId: 1 }, { unique: true, partialFilterExpression: { shareId: { $type: "string" } } });
quizSchema.index({ owner: 1, createdAt: -1 });
module.exports = model("Quiz", quizSchema);

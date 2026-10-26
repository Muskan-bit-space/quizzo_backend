const { Schema, model } = require("mongoose");
const userSchema = new Schema({
  name: { type: String, trim: true, maxlength: 80 },
  email: { type: String, required: true, trim: true, maxlength: 254 },
  // Separate canonical key preserves old documents until their verified login.
  emailCanonical: { type: String, lowercase: true, trim: true, select: false },
  passwordHash: { type: String, select: false },
  password: { type: String, select: false }, // Read only for legacy login upgrade.
  quizzes_created: [{ type: Schema.Types.ObjectId, ref: "Quiz" }], // Legacy; ownership uses Quiz.owner.
}, { timestamps: true });
userSchema.index({ emailCanonical: 1 }, { unique: true, partialFilterExpression: { emailCanonical: { $type: "string" } } });
userSchema.pre("validate", function () {
  if (this.isNew && !this.passwordHash) this.invalidate("passwordHash", "A password hash is required.");
});
userSchema.set("toJSON", { transform: (_doc, value) => {
  delete value.password; delete value.passwordHash; delete value.emailCanonical; return value;
} });
// Keep the existing collection and model name, so old owners retain their IDs.
const User = model("user", userSchema, "users");
module.exports = { User };

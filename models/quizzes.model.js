
const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    options: {
      type: [String],
      required: true,
      validate: {
        validator(options) {
          return (
            options.length >= 2 &&
            options.length <= 10 &&
            options.every(
              (option) =>
                typeof option === "string" &&
                option.trim().length > 0 &&
                option.length <= 500
            )
          );
        },
        message: "Each question must have 2–10 non-empty options.",
      },
    },

    // Zero-based index into options[]
    correctOption: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator(value) {
          return (
            Number.isInteger(value) &&
            value < this.options.length
          );
        },
        message: "correctOption must reference an existing option.",
      },
    },
  },
  { _id: true }
);

const quizSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 150,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    questions: {
      type: [questionSchema],
      required: true,
      validate: {
        validator(questions) {
          return questions.length >= 1 && questions.length <= 200;
        },
        message: "A quiz must contain 1–200 questions.",
      },
    },

    // Set by the backend after authentication.
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Quiz", quizSchema);

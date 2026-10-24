
const mongoose = require("mongoose");
const Quiz = require("../models/quizzes.model");

const MAX_QUESTIONS = 200;
const MAX_OPTIONS = 10;

async function createQuiz(req, res) {
  try {
    const { title, description = "", questions } = req.body || {};
    console.log("received quiz: ", title, description , questions )

    // Your requireAuth middleware must attach the verified user
    // to req.user. Adjust this expression to match your middleware.
    const ownerId = req.user?._id || req.user?.id;

    if (!ownerId || !mongoose.isValidObjectId(ownerId)) {
      return res.status(401).json({
        error: "Authenticated user not found.",
      });
    }

    if (typeof title !== "string" || !title.trim() ||  title.trim().length > 150) {
      return res.status(400).json({
        error: "Title is required and must be at most 150 characters.",
      });
    }

    if (
      typeof description !== "string" ||
      description.length > 2000
    ) {
      return res.status(400).json({
        error: "Description must be at most 2000 characters.",
      });
    }

    if (
      !Array.isArray(questions) ||
      questions.length < 1 ||
      questions.length > MAX_QUESTIONS
    ) {
      return res.status(400).json({
        error: `A quiz must have 1–${MAX_QUESTIONS} questions.`,
      });
    }

    // Whitelist allowed fields. Never pass req.body directly to MongoDB.
    const cleanQuestions = [];

    for (let i = 0; i < questions.length; i += 1) {
      const question = questions[i];

      if (
        !question ||
        typeof question.text !== "string" ||
        !question.text.trim() ||
        question.text.trim().length > 2000
      ) {
        return res.status(400).json({
          error: `Question ${i + 1} has invalid text.`,
        });
      }

      if (
        !Array.isArray(question.options) ||
        question.options.length < 2 ||
        question.options.length > MAX_OPTIONS
      ) {
        return res.status(400).json({
          error: `Question ${i + 1} must have 2–${MAX_OPTIONS} options.`,
        });
      }

      const options = [];

      for (const option of question.options) {
        if (
          typeof option !== "string" ||
          !option.trim() ||
          option.trim().length > 500
        ) {
          return res.status(400).json({
            error: `Question ${i + 1} has an invalid option.`,
          });
        }

        options.push(option.trim());
      }

      // Prevent confusing duplicate choices, ignoring case/outer spaces.
      const normalizedOptions = options.map((option) =>
        option.toLocaleLowerCase()
      );

      if (new Set(normalizedOptions).size !== options.length) {
        return res.status(400).json({
          error: `Question ${i + 1} contains duplicate options.`,
        });
      }

      if (
        !Number.isInteger(question.correctOption) ||
        question.correctOption < 0 ||
        question.correctOption >= options.length
      ) {
        return res.status(400).json({
          error: `Question ${i + 1} has an invalid correct option.`,
        });
      }

      cleanQuestions.push({
        text: question.text.trim(),
        options,
        correctOption: question.correctOption,
      });
    }

    const quiz = await Quiz.create({
      title: title.trim(),
      description: description.trim(),
      questions: cleanQuestions,
      owner: ownerId,
    });

    return res.status(201).json({
      message: "Quiz created successfully.",
      quiz: {
        id: quiz._id,
        title: quiz.title,
        description: quiz.description,
        questionCount: quiz.questions.length,
        createdAt: quiz.createdAt,
      },
    });
  } catch (error) {
    if (error.name === "ValidationError" ||
        error.name === "CastError") {
      return res.status(400).json({
        error: "Quiz data is invalid.",
      });
    }

    console.error("createQuiz failed:", error);

    return res.status(500).json({
      error: "Unable to save the quiz. Please try again.",
    });
  }
}

async function getMyQuizzes(req, res) {
  try {
    const ownerId = req.user?._id || req.user?.id;

    if (!ownerId || !mongoose.isValidObjectId(ownerId)) {
      return res.status(401).json({ error: "Authenticated user not found." });
    }

    const quizzes = await Quiz.find({ owner: ownerId })
      .select("_id title description questions createdAt updatedAt")
      .sort({ createdAt: -1 })
      .lean();

    const payload = quizzes.map((quiz) => ({
      id: quiz._id,
      title: quiz.title,
      description: quiz.description,
      questionCount: quiz.questions.length,
      createdAt: quiz.createdAt,
      updatedAt: quiz.updatedAt,
    }));

    return res.status(200).json({ quizzes: payload });
  } catch (error) {
    console.error("getMyQuizzes failed:", error);
    return res.status(500).json({ error: "Unable to fetch quizzes. Please try again." });
  }
}

module.exports = { createQuiz, getMyQuizzes };

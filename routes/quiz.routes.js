const router = require("express").Router();
const { createQuiz, getMyQuizzes, getQuiz, getAttempts } = require("../controllers/quiz.controller");
const { requireAuth } = require("../middlewares/requireAuth");
router.use(requireAuth);
router.get("/", getMyQuizzes);
router.post("/", createQuiz);
router.get("/:quizId", getQuiz);
router.get("/:quizId/attempts", getAttempts);
module.exports = router;

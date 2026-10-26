const router = require("express").Router();
const { requireAuth } = require("../middlewares/requireAuth");
const { getSharedQuiz } = require("../controllers/quiz.controller");
const { startAttempt } = require("../controllers/attempt.controller");
router.use(requireAuth);
router.get("/quizzes/:shareId", getSharedQuiz);
router.post("/quizzes/:shareId/attempts", startAttempt);
module.exports = router;

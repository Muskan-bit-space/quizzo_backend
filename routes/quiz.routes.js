
const express = require("express");
const router = express.Router();

const { createQuiz, getMyQuizzes } = require("../controllers/quiz.controller");
const {requireAuth} = require("../middlewares/requireAuth");
console.log("requireAuth:", typeof requireAuth);
console.log("createQuiz:", typeof createQuiz);
console.log("getMyQuizzes:", typeof getMyQuizzes);
router.get("/", requireAuth, getMyQuizzes);
router.post("/", requireAuth, createQuiz);

module.exports = router;

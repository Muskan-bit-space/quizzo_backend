
const express = require("express");
const router = express.Router();

const { createQuiz } = require("../controllers/quiz.controller");
const {requireAuth} = require("../middlewares/requireAuth");
console.log("requireAuth:", typeof requireAuth);
console.log("createQuiz:", typeof createQuiz);
router.post("/", requireAuth, createQuiz);

module.exports = router;

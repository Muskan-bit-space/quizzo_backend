const router = require("express").Router();
const { requireAuth } = require("../middlewares/requireAuth");
const { getAttempt, submitAttempt } = require("../controllers/attempt.controller");
router.use(requireAuth);
router.get("/:attemptId", getAttempt);
router.post("/:attemptId/submit", submitAttempt);
module.exports = router;

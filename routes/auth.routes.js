const router = require("express").Router();
const { signup, signin, getMe } = require("../controllers/auth.controller");
const { requireAuth } = require("../middlewares/requireAuth");
router.post("/signup", signup);
router.post("/signin", signin);
router.get("/me", requireAuth, getMe);
module.exports = router;

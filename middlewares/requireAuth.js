const jwt = require("jsonwebtoken");
const { User } = require("../models/users.model");
const { HttpError } = require("../lib/errors");
const { objectId } = require("../lib/validation");

async function requireAuth(req, res, next) {
  const match = req.get("Authorization")?.match(/^Bearer ([^\s]+)$/i);
  if (!match) throw new HttpError(401, "Sign in to continue.");
  let claims;
  try {
    claims = jwt.verify(match[1], req.app.locals.config.jwtSecret, {
      algorithms: ["HS256"], issuer: "quizly", audience: "quizly:web",
    });
  } catch { throw new HttpError(401, "Your session is invalid or expired. Please sign in again."); }
  if (!objectId(claims.sub)) throw new HttpError(401, "Your session is invalid. Please sign in again.");
  const user = await User.findById(claims.sub).select("_id name email");
  if (!user) throw new HttpError(401, "This account is no longer available.");
  req.user = user;
  next();
}
module.exports = { requireAuth };

const jwt = require("jsonwebtoken");
function jwtmaker(config, user) {
  return jwt.sign({}, config.jwtSecret, {
    subject: String(user._id), expiresIn: config.jwtTtl,
    algorithm: "HS256", issuer: "quizly", audience: "quizly:web",
  });
}
module.exports = { jwtmaker };

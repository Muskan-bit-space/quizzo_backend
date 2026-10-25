const { User } = require("../models/users.model");
const userCreate = require("./user.create.controller");
const { jwtmaker } = require("./jwt.maker.controller");
const { hashPassword, verifyPassword, verifyLegacyPassword } = require("../lib/passwords");
const { bodyObject, emailValue, passwordValue, requiredString } = require("../lib/validation");
const { publicUser, userName } = require("../lib/serializers");
const { HttpError } = require("../lib/errors");

function emailQuery(email) {
  const escaped = [...email].map(char => ".*+?^$[](){}|\\".includes(char) ? "\\" + char : char).join("");
  return { $or: [{ emailCanonical: email }, { email: new RegExp("^\\s*" + escaped + "\\s*$", "i") }] };
}
async function signup(req, res) {
  bodyObject(req.body);
  const email = emailValue(req.body.email);
  const password = passwordValue(req.body.password, true);
  const name = requiredString(req.body.name, "Name", 80);
  if (await User.exists(emailQuery(email))) throw new HttpError(409, "An account with this email already exists.");
  const user = await userCreate(email, password, name);
  res.status(201).json({ user: publicUser(user) });
}
async function signin(req, res) {
  bodyObject(req.body);
  const email = emailValue(req.body.email);
  const password = passwordValue(req.body.password);
  const candidates = await User.find(emailQuery(email)).select("+passwordHash +password +emailCanonical").limit(2);
  if (candidates.length > 1) throw new HttpError(409, "Multiple legacy accounts use this email. An administrator must resolve them without deleting your quizzes.");
  let user = candidates[0];
  if (!user) {
    await hashPassword(password); // Similar password-work cost for unknown accounts.
    throw new HttpError(401, "Email or password is incorrect.");
  }
  const valid = user.passwordHash ? await verifyPassword(password, user.passwordHash) : verifyLegacyPassword(password, user.password);
  if (!valid) throw new HttpError(401, "Email or password is incorrect.");
  if (!user.passwordHash) {
    const passwordHash = await hashPassword(password);
    const upgraded = await User.findOneAndUpdate(
      { _id: user._id, passwordHash: { $in: [null, ""] } },
      { $set: { passwordHash, name: userName(user), email, emailCanonical: email }, $unset: { password: "" } },
      { new: true, runValidators: true },
    );
    user = upgraded || await User.findById(user._id);
  } else if (!user.emailCanonical) {
    await User.updateOne({ _id: user._id }, { $set: { emailCanonical: email, email } });
  }
  res.json({ token: jwtmaker(req.app.locals.config, user), user: publicUser(user) });
}
async function getMe(req, res) {
  res.json({ user: publicUser(req.user) });
}
module.exports = { signup, signin, getMe };

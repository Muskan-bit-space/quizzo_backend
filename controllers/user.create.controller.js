const { User } = require("../models/users.model");
const { hashPassword } = require("../lib/passwords");
async function user_create(email, password, name) {
  return User.create({ email, emailCanonical: email, name, passwordHash: await hashPassword(password) });
}
module.exports = user_create;

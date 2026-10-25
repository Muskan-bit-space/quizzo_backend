const mongoose = require("mongoose");
const { User } = require("./models/users.model");
const Quiz = require("./models/quizzes.model");
const Attempt = require("./models/attempts.model");

async function connectDB(uri, options = {}) {
  mongoose.set("bufferCommands", false);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000, autoIndex: false, ...options });
  // Create only declared indexes; never drop indexes or collections.
  await Promise.all([User.createIndexes(), Quiz.createIndexes(), Attempt.createIndexes()]);
}
async function disconnectDB() { await mongoose.disconnect(); }
module.exports = { connectDB, disconnectDB };

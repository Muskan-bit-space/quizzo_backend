const path = require("node:path");

function localMongo() {
  process.env.MONGOMS_DOWNLOAD_DIR ||= path.resolve(__dirname, "../.cache/mongodb");
  try { return require("mongodb-memory-server").MongoMemoryServer; }
  catch (error) {
    if (error.code !== "MODULE_NOT_FOUND") throw error;
    throw new Error("Optional local MongoDB tooling is missing. Run npm run setup:local, or use your own MongoDB with MONGOURL (TEST_MONGO_URL for integration tests).");
  }
}
module.exports = { localMongo };

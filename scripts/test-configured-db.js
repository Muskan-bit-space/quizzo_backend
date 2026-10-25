// Explicit opt-in to testing the configured MongoDB server. The test suite
// always overrides the database name with an isolated quizly_test_* database.
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const dotenv = require("dotenv");
const { validateMongoUrl } = require("../lib/mongo-config");

const root = path.resolve(__dirname, "..");
const envPath = path.join(root, ".env");
const saved = fs.existsSync(envPath) ? dotenv.parse(fs.readFileSync(envPath, "utf8")) : {};
const uri = process.env.TEST_MONGO_URL || process.env.MONGOURL || saved.MONGOURL;
if (!uri || !/^mongodb(?:\+srv)?:\/\//.test(uri)) {
  console.error("Save MONGOURL in quizzo_backend/.env, or set TEST_MONGO_URL, before running configured database tests.");
  process.exitCode = 1;
} else {
  try { validateMongoUrl(uri); }
  catch (error) { console.error(error.message); process.exit(1); }
  console.log("Testing the configured MongoDB server in an isolated temporary database. Connection credentials are not printed.");
  const result = spawnSync(process.execPath, ["--test", "tests/integration/workflow.test.js"], {
    cwd: root, env: { ...process.env, TEST_MONGO_URL: uri }, stdio: "inherit",
  });
  if (result.error) {
    console.error("Could not launch the integration test process.", { code: result.error.code });
    process.exitCode = 1;
  } else process.exitCode = result.status ?? 1;
}

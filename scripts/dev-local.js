// Real MongoDB, stored on disk, for local development without a system install.
const fs = require("node:fs");
const path = require("node:path");
const { randomBytes } = require("node:crypto");
const localDir = path.resolve(__dirname, "../.local");
const dataDir = path.join(localDir, "mongodb");
fs.mkdirSync(dataDir, { recursive: true });
const { localMongo } = require("./local-mongo");
const { loadConfig } = require("../env");
const { startServer, installShutdown } = require("../server");

async function run() {
  const MongoMemoryServer = localMongo();
  const secretPath = path.join(localDir, "jwt-secret");
  if (!fs.existsSync(secretPath)) fs.writeFileSync(secretPath, randomBytes(48).toString("hex"), { flag: "wx", mode: 0o600 });
  const secret = fs.readFileSync(secretPath, "utf8").trim();
  const mongo = await MongoMemoryServer.create({
    instance: { dbPath: dataDir, dbName: "quizly_local", ip: "127.0.0.1", port: 27027, storageEngine: "wiredTiger" },
  });
  try {
    const runtime = await startServer(loadConfig({
      MONGOURL: mongo.getUri("quizly_local"), JWT_SECRET: secret,
      SERVE_FRONTEND: fs.existsSync(path.resolve(__dirname, "../../quizzo_frontend/dist/index.html")) ? "true" : "false",
    }));
    installShutdown({
      async close() {
        try { await runtime.close(); } finally { await mongo.stop({ doCleanup: false }); }
      },
    });
    console.log("Local data persists in quizzo_backend/.local/mongodb. Press Ctrl+C for a clean shutdown.");
  } catch (error) {
    await mongo.stop({ doCleanup: false });
    throw error;
  }
}
run().catch(error => {
  if (error.message.startsWith("Optional local MongoDB")) console.error(error.message);
  else console.error("Local startup failed. Check ports 4444/27027, MongoDB download access, and the setup guide.", { type: error.name });
  process.exitCode = 1;
});

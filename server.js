const { createServer } = require("node:http");
const { connectDB, disconnectDB } = require("./db");

async function startServer(config) {
  const { createApp } = require("./app");
  try {
    await connectDB(config.mongoUrl);
    const server = createServer(createApp(config));
    server.requestTimeout = 30000;
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(config.port, config.host, () => { server.removeListener("error", reject); resolve(); });
    });
    console.log(`Quizly is ready at http://${config.host}:${server.address().port}`);
    return {
      server,
      async close() {
        await new Promise((resolve, reject) => {
          server.close(error => error ? reject(error) : resolve());
          server.closeIdleConnections();
        });
        await disconnectDB();
      },
    };
  } catch (error) {
    await disconnectDB();
    throw error;
  }
}
function installShutdown(runtime) {
  let closing = false;
  async function shutdown() {
    if (closing) return;
    closing = true;
    const force = setTimeout(() => process.exit(1), 10000).unref();
    try { await runtime.close(); clearTimeout(force); process.exitCode = 0; }
    catch { console.error("Could not close all server resources."); process.exitCode = 1; }
  }
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
  return runtime;
}
module.exports = { startServer, installShutdown };

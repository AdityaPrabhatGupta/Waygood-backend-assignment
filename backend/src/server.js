const app = require("./app");
const connectDatabase = require("./config/database");
const env = require("./config/env");

async function startServer() {
  const server = app.listen(env.port, () => {
    console.log(`Waygood evaluation API running on port ${env.port}`);
  });

  try {
    await connectDatabase();
  } catch (error) {
    console.error("Failed to connect to database on startup:", error);
    server.close(() => {
      process.exit(1);
    });
  }
}

startServer().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});

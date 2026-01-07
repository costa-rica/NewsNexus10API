// Load environment variables FIRST (before anything else)
// Note: In production with systemd EnvironmentFile, vars are already set.
// dotenv won't override them by default, showing (0) loaded - this is expected.
require("dotenv").config();

// Initialize Winston logger (after env vars are loaded)
// This sets up console.* method overrides and file logging
require("./modules/logger");

const app = require("./app"); // Import the configured app
const PORT = process.env.PORT || 8001;

// Note: logger.info and logger.error are now handled by Winston logger
// Winston also handles uncaughtException and unhandledRejection
// See src/modules/logger.js for configuration

// Start the server
app.listen(PORT, "0.0.0.0", () => {
  logger.info(`Server running on http://0.0.0.0:${PORT}`);
});

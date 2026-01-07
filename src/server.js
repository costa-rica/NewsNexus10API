// Load environment variables FIRST (before anything else)
// Note: In production with systemd EnvironmentFile, vars are already set.
// dotenv won't override them by default, showing (0) loaded - this is expected.
require("dotenv").config();

// Initialize Winston logger (after env vars are loaded)
const logger = require("./modules/logger");

const app = require("./app"); // Import the configured app
const PORT = process.env.PORT || 8001;

// Start the server
app.listen(PORT, "0.0.0.0", () => {
  logger.info(`Server running on http://0.0.0.0:${PORT}`);
});

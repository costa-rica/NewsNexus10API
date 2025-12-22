// Load environment variables FIRST (before anything else)
require("dotenv").config();

// Initialize Winston logger (after env vars are loaded)
// This sets up console.* method overrides and file logging
require("./modules/logger");

const app = require("./app"); // Import the configured app
const PORT = process.env.PORT || 8001;

// Note: console.log and console.error are now handled by Winston logger
// Winston also handles uncaughtException and unhandledRejection
// See src/modules/logger.js for configuration

// Start the server
app.listen(PORT, "0.0.0.0", () => {
	console.log(`Server running on http://0.0.0.0:${PORT}`);
});

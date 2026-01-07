/**
 * Winston Logger Configuration
 *
 * Logging Modes:
 * - development: Console only
 * - testing: Console + log files
 * - production: Log files only
 *
 * Required Environment Variables:
 * - NODE_ENV: development, testing, or production
 * - NAME_APP: Application identifier (used for log file names)
 * - PATH_TO_LOGS: Absolute path to log directory
 *
 * Optional Environment Variables:
 * - LOG_MAX_SIZE: Max size per log file in MB (default: 5)
 * - LOG_MAX_FILES: Number of rotated files to retain (default: 5)
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// ============================================================================
// STARTUP VALIDATION - Exit immediately if required variables are missing
// ============================================================================

const requiredVars = {
  NODE_ENV: process.env.NODE_ENV,
  NAME_APP: process.env.NAME_APP,
  PATH_TO_LOGS: process.env.PATH_TO_LOGS
};

// Check for missing required variables
const missingVars = Object.entries(requiredVars)
  .filter(([key, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error(`FATAL ERROR: Missing required environment variable(s): ${missingVars.join(', ')}`);
  console.error('Logger cannot be initialized. Application will now exit.');
  process.exit(1);
}

// Validate NODE_ENV value
const validEnvironments = ['development', 'testing', 'production'];
if (!validEnvironments.includes(process.env.NODE_ENV)) {
  console.error(`FATAL ERROR: NODE_ENV must be one of: ${validEnvironments.join(', ')}`);
  console.error(`Received: ${process.env.NODE_ENV}`);
  process.exit(1);
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const NODE_ENV = process.env.NODE_ENV;
const NAME_APP = process.env.NAME_APP;
const PATH_TO_LOGS = process.env.PATH_TO_LOGS;

// Optional configuration with defaults
const LOG_MAX_SIZE = parseInt(process.env.LOG_MAX_SIZE || '5', 10) * 1024 * 1024; // Convert MB to bytes
const LOG_MAX_FILES = parseInt(process.env.LOG_MAX_FILES || '5', 10);

// Ensure log directory exists
try {
  if (!fs.existsSync(PATH_TO_LOGS)) {
    fs.mkdirSync(PATH_TO_LOGS, { recursive: true });
  }
} catch (error) {
  console.error(`FATAL ERROR: Cannot create log directory at ${PATH_TO_LOGS}`);
  console.error(error.message);
  process.exit(1);
}

// ============================================================================
// LOG LEVEL CONFIGURATION
// ============================================================================

/**
 * Determine the appropriate log level based on environment
 * - development: debug and above (all levels)
 * - testing: info and above
 * - production: info and above
 */
function getLogLevel() {
  switch (NODE_ENV) {
    case 'development':
      return 'debug';
    case 'testing':
    case 'production':
      return 'info';
    default:
      return 'info';
  }
}

// ============================================================================
// FORMAT CONFIGURATION
// ============================================================================

/**
 * Custom format for log messages
 * Format: [timestamp] [level] [app-name] message
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    const baseMessage = `[${timestamp}] [${level.toUpperCase()}] [${NAME_APP}] ${message}`;
    return stack ? `${baseMessage}\n${stack}` : baseMessage;
  })
);

// ============================================================================
// TRANSPORT CONFIGURATION
// ============================================================================

/**
 * Build transports array based on environment mode
 */
function getTransports() {
  const transports = [];

  // File transport configuration (for testing and production)
  const fileTransportConfig = {
    filename: path.join(PATH_TO_LOGS, `${NAME_APP}.log`),
    maxsize: LOG_MAX_SIZE,
    maxFiles: LOG_MAX_FILES,
    tailable: true,
    format: logFormat
  };

  // Console transport configuration
  const consoleTransportConfig = {
    format: winston.format.combine(
      winston.format.colorize(),
      logFormat
    )
  };

  // Configure transports based on environment
  switch (NODE_ENV) {
    case 'development':
      // Console only
      transports.push(new winston.transports.Console(consoleTransportConfig));
      break;

    case 'testing':
      // Console AND files
      transports.push(new winston.transports.Console(consoleTransportConfig));
      transports.push(new winston.transports.File(fileTransportConfig));
      break;

    case 'production':
      // Files only
      transports.push(new winston.transports.File(fileTransportConfig));
      break;
  }

  return transports;
}

// ============================================================================
// LOGGER INITIALIZATION
// ============================================================================

const logger = winston.createLogger({
  level: getLogLevel(),
  transports: getTransports(),
  exitOnError: false
});

// ============================================================================
// INITIALIZATION LOG
// ============================================================================

logger.info('='.repeat(80));
logger.info(`Logger initialized successfully`);
logger.info(`Environment: ${NODE_ENV}`);
logger.info(`Log Level: ${getLogLevel()}`);
logger.info(`Application: ${NAME_APP}`);
if (NODE_ENV !== 'development') {
  logger.info(`Log Directory: ${PATH_TO_LOGS}`);
  logger.info(`Max File Size: ${LOG_MAX_SIZE / 1024 / 1024}MB`);
  logger.info(`Max Files: ${LOG_MAX_FILES}`);
}
logger.info('='.repeat(80));

// ============================================================================
// EXPORT
// ============================================================================

module.exports = logger;

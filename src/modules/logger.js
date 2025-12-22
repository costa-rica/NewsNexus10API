/**
 * Winston Logger Configuration
 *
 * This module configures Winston logging with monkey-patching for console methods.
 * It supports both production (file-based) and development (console) modes.
 *
 * Features:
 * - Automatic console.* method overriding (Phase 1: monkey-patching)
 * - Environment-based configuration (production vs development)
 * - Child process detection (logs to stdout only)
 * - File rotation in production
 * - Graceful fallback on errors
 *
 * See: /docs/LOGGING_NODE_JS.md for full requirements
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Environment configuration
const isProduction = process.env.NODE_ENV === 'production';
const appName = process.env.APP_NAME || 'app';
const logDir = process.env.PATH_TO_LOGS || './logs';
const maxSize = parseInt(process.env.LOG_MAX_SIZE) || 10485760; // 10MB default
const maxFiles = parseInt(process.env.LOG_MAX_FILES) || 10;

// Detect if running as child process
const isChildProcess = process.send !== undefined;

// Process identification for child processes
const processId = isChildProcess ? `${appName}:worker:${process.pid}` : appName;

/**
 * Create log directory if it doesn't exist (production only)
 */
function ensureLogDirectory() {
	if (isProduction && !isChildProcess) {
		try {
			if (!fs.existsSync(logDir)) {
				fs.mkdirSync(logDir, { recursive: true, mode: 0o750 });
				console.warn(`[${appName}] Created log directory: ${logDir}`);
			}
		} catch (err) {
			console.error(`[${appName}] Failed to create log directory: ${err.message}`);
			console.error(`[${appName}] Falling back to console logging only`);
			return false;
		}
	}
	return true;
}

/**
 * Define log format for production (file-based)
 */
const productionFormat = winston.format.combine(
	winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
	winston.format.errors({ stack: true }),
	winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
		// Format metadata
		const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';

		// Include stack trace if present
		const stackStr = stack ? `\n${stack}` : '';

		return `[${timestamp}] [${level.toUpperCase().padEnd(5)}] [${processId}] ${message}${metaStr}${stackStr}`;
	})
);

/**
 * Define log format for development (console-based)
 */
const developmentFormat = winston.format.combine(
	winston.format.timestamp({ format: 'HH:mm:ss' }),
	winston.format.errors({ stack: true }),
	winston.format.colorize(),
	winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
		const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
		const stackStr = stack ? `\n${stack}` : '';
		return `${timestamp} ${level.padEnd(15)} [${processId}] ${message}${metaStr}${stackStr}`;
	})
);

/**
 * Create Winston logger instance
 */
const logger = winston.createLogger({
	level: isProduction ? 'info' : 'debug',
	format: isProduction ? productionFormat : developmentFormat,
	transports: [],
	// Handle uncaught exceptions and unhandled rejections
	exceptionHandlers: [],
	rejectionHandlers: []
});

/**
 * Configure transports based on environment and process type
 */
function configureTransports() {
	// Child processes always log to console (stdout)
	if (isChildProcess) {
		logger.add(new winston.transports.Console({
			format: productionFormat // Use production format for consistency
		}));
		return;
	}

	// Production parent process: log to files
	if (isProduction) {
		const canWriteFiles = ensureLogDirectory();

		if (canWriteFiles) {
			try {
				// Main log file with rotation
				logger.add(new winston.transports.File({
					filename: path.join(logDir, `${appName}.log`),
					maxsize: maxSize,
					maxFiles: maxFiles,
					tailable: true
				}));

				// Exception handler (writes to separate file)
				logger.exceptions.handle(
					new winston.transports.File({
						filename: path.join(logDir, `${appName}-exceptions.log`),
						maxsize: maxSize,
						maxFiles: maxFiles
					})
				);

				// Rejection handler (writes to separate file)
				logger.rejections.handle(
					new winston.transports.File({
						filename: path.join(logDir, `${appName}-rejections.log`),
						maxsize: maxSize,
						maxFiles: maxFiles
					})
				);

				console.log(`[${appName}] Winston file logging initialized: ${logDir}`);
			} catch (err) {
				console.error(`[${appName}] Failed to initialize file logging: ${err.message}`);
				console.error(`[${appName}] Falling back to console logging`);
				// Add console transport as fallback
				logger.add(new winston.transports.Console());
			}
		} else {
			// Fallback to console if directory creation failed
			logger.add(new winston.transports.Console());
		}
	} else {
		// Development mode: console only with colorized output
		logger.add(new winston.transports.Console());
	}
}

// Initialize transports
configureTransports();

/**
 * Monkey-patch console methods to use Winston
 *
 * This allows existing console.* calls to work without code changes
 * while benefiting from Winston's features.
 */

// Store original console methods (in case we need them)
const originalConsole = {
	log: console.log,
	error: console.error,
	warn: console.warn,
	info: console.info,
	debug: console.debug
};

// Override console.log -> Winston info level
console.log = (...args) => {
	const message = args.map(arg =>
		typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
	).join(' ');
	logger.info(message);
};

// Override console.error -> Winston error level
console.error = (...args) => {
	const message = args.map(arg =>
		typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
	).join(' ');
	logger.error(message);
};

// Override console.warn -> Winston warn level
console.warn = (...args) => {
	const message = args.map(arg =>
		typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
	).join(' ');
	logger.warn(message);
};

// Override console.info -> Winston info level
console.info = (...args) => {
	const message = args.map(arg =>
		typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
	).join(' ');
	logger.info(message);
};

// Override console.debug -> Winston debug level
console.debug = (...args) => {
	const message = args.map(arg =>
		typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
	).join(' ');
	logger.debug(message);
};

/**
 * Log initialization message
 */
const mode = isProduction ? 'production' : 'development';
const processType = isChildProcess ? 'child process' : 'parent process';
const logDestination = isProduction && !isChildProcess ? `files in ${logDir}` : 'console';

logger.info(`Winston logger initialized: ${mode} mode, ${processType}, logging to ${logDestination}`);

// Export both the logger and original console methods
module.exports = {
	logger,
	originalConsole // In case direct Winston calls or original console is needed
};

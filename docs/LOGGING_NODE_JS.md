# Node.js Logging Requirements

## Overview

This document specifies the logging requirements and implementation strategy for all Node.js applications in the NewsNexus suite using the Winston logging package. The approach is designed to minimize code changes during initial implementation while providing production-grade logging capabilities.

## Objectives

- Implement standardized logging across all Node.js applications
- Support production file-based logging with minimal code changes
- Enable gradual migration from `console.*` to Winston `logger` API
- Handle multi-process scenarios without file locking conflicts
- Maintain development-friendly console output

## Framework Coverage

This logging strategy applies to:

- **Express.js applications** (e.g., NewsNexus10API)
- **Next.js applications** (server-side only)
- **Node.js scripts** (running as parent or child processes)

## Configuration

### Environment Variables

The following environment variables control logging behavior:

| Variable        | Required        | Description                                         | Example                       |
| --------------- | --------------- | --------------------------------------------------- | ----------------------------- |
| `NODE_ENV`      | Yes             | Environment mode                                    | `production` or `development` |
| `APP_NAME`      | Yes             | Application identifier for log filenames            | `NewsNexus10API`              |
| `PATH_TO_LOGS`  | Production only | Directory path for log file storage                 | `/var/log/newsnexus`          |
| `LOG_MAX_SIZE`  | No              | Maximum size per log file (default: 10MB)           | `10485760` (bytes)            |
| `LOG_MAX_FILES` | No              | Maximum number of log files to retain (default: 10) | `10`                          |

### Next.js Specific Overrides

For Next.js applications, the standard environment variables can be overridden or supplemented to match Next.js conventions:

| Standard Variable | Next.js Equivalent | Description                                                                                                                                        |
| ----------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`        | `NEXT_PUBLIC_MODE` | Used to determine if the app is in `production` or `development` mode for logging purposes. If `NEXT_PUBLIC_MODE` is present, it takes precedence. |

**Note**: In Next.js, environment variables intended for the browser must start with `NEXT_PUBLIC_`. While logging configuration is server-side, using `NEXT_PUBLIC_MODE` allows for a consistent environment usage across the stack if desired.

### Log Levels

Winston log levels used (in order of priority):

1. `error` - Error conditions requiring attention
2. `warn` - Warning conditions that should be reviewed
3. `info` - Informational messages about application state
4. `http` - HTTP request/response logging
5. `verbose` - Detailed operational information
6. `debug` - Debug-level messages for troubleshooting
7. `silly` - Extremely detailed diagnostic information

## Implementation Strategy

### Phase 1: Monkey-Patching (Initial Implementation)

Use Winston to intercept existing `console.*` calls without changing application code:

- **Approach**: Override global `console` object methods
- **Benefit**: Zero code changes required initially
- **Console Method Mapping**:
  - `console.error()` → Winston `error` level
  - `console.warn()` → Winston `warn` level
  - `console.info()` → Winston `info` level
  - `console.log()` → Winston `info` level
  - `console.debug()` → Winston `debug` level

### Phase 2: Gradual Migration (Future)

Over time, replace `console.*` calls with direct Winston `logger` usage:

```javascript
// Old approach
console.log("User authenticated:", userId);

// New approach
logger.info("User authenticated", { userId });
```

**Benefits of migration**:

- Structured logging with metadata objects
- Better log level control
- Enhanced searchability and filtering
- Consistent formatting

## Multi-Process Strategy

### Parent Processes

**Behavior**: Write logs to files in production, console in development

- Express.js servers
- Next.js server processes
- Standalone Node.js applications
- Main application processes (running under systemd in production)

**Configuration**:

```javascript
// Production
- File transport: Write to rotating log files
- Format: Human-readable with timestamps

// Development
- Console transport only
- Format: Colorized human-readable
```

### Child Processes

**Behavior**: Always log to stdout, regardless of environment

- Node.js scripts spawned by parent processes
- Worker processes
- Background job runners

**Implementation**:

```javascript
// Child processes always use console transport
// Parent captures stdout and writes to its log files
// Child logs include process identifier
```

**Rationale**: Prevents file locking conflicts and resource contention when multiple processes attempt to write to the same log file.

## Environment-Specific Behavior

### Production Mode (`NODE_ENV=production`)

**Parent Processes**:

- Write to rotating log files in `PATH_TO_LOGS` directory
- Filename pattern: `${APP_NAME}-YYYY-MM-DD-HH.log` (with rotation number if needed)
- File rotation: Size-based (default 10MB per file)
- Retention: Keep last 10 files by default
- Format: Human-readable text with timestamps
- No console output (unless explicitly configured)

**Child Processes**:

- Write to stdout only
- Parent process captures and logs child output
- Include process identifier in log messages

### Development Mode (`NODE_ENV !== 'production'`)

**All Processes**:

- Console output only
- No file writing
- Colorized output for better readability
- More verbose logging levels enabled
- Immediate output (no buffering)

## Log Format Specification

### Human-Readable Format (Production Files)

```
[2025-12-21 14:32:15.234] [INFO] [NewsNexus10API] User authentication successful { userId: 123, email: "user@example.com" }
[2025-12-21 14:32:16.891] [ERROR] [NewsNexus10API] Database connection failed { error: "ECONNREFUSED", host: "localhost", port: 5432 }
[2025-12-21 14:32:17.456] [WARN] [NewsNexus10API] API rate limit approaching { endpoint: "/articles", remaining: 10 }
```

**Format Components**:

- Timestamp in ISO format with milliseconds
- Log level in uppercase
- Application name from `APP_NAME` env variable
- Message string
- Metadata object (if provided) in JSON format

### Console Format (Development)

```
14:32:15 INFO  [NewsNexus10API] User authentication successful { userId: 123 }
14:32:16 ERROR [NewsNexus10API] Database connection failed { error: "ECONNREFUSED" }
```

**Format Components**:

- Time only (no date for cleaner output)
- Colorized log level
- Application name
- Message and metadata

### Child Process Log Markers

Child process logs should include process identification:

```
[2025-12-21 14:32:15.234] [INFO] [NewsNexus10API:worker:12345] Background job completed { jobId: 789 }
```

Format: `[APP_NAME:process-type:PID]`

## File Rotation Strategy

### Size-Based Rotation

- **Trigger**: File size exceeds `LOG_MAX_SIZE` (default 10MB)
- **Naming**: `${APP_NAME}-error.log`, `${APP_NAME}-error.1.log`, `${APP_NAME}-error.2.log`, etc.
- **Retention**: Keep last `LOG_MAX_FILES` files (default 10)
- **Compression**: Optional gzip compression for rotated files

### Example File Structure

```
/var/log/newsnexus/
├── NewsNexus10API.log           # Current log file
├── NewsNexus10API.1.log         # Previous rotation
├── NewsNexus10API.2.log         # Older rotation
└── NewsNexus10API.3.log         # Oldest rotation
```

## Error Handling

### Log Directory Issues

**Missing Directory**:

```javascript
// Create PATH_TO_LOGS directory if it doesn't exist
// Fail gracefully and fall back to console logging
// Log warning about directory creation
```

**Permission Denied**:

```javascript
// Catch EACCES errors
// Fall back to console logging
// Emit warning to stderr
```

**Disk Space Issues**:

```javascript
// Handle ENOSPC errors
// Attempt to rotate/clean old files
// Fall back to console logging if unable to write
```

## Framework-Specific Considerations

### Express.js Applications

**Integration Points**:

1. Initialize Winston logger before requiring routes
2. Add HTTP request logging middleware
3. Capture uncaught exceptions and unhandled rejections
4. Log server startup and shutdown events

**HTTP Request Logging**:

```javascript
// Use morgan or custom middleware
// Log format: [timestamp] [HTTP] METHOD /path STATUS duration ms
logger.http("GET /api/articles 200 45ms", {
  method: "GET",
  url: "/api/articles",
  status: 200,
  duration: 45,
});
```

### Next.js Applications

**Server-Side Only**:

- Apply logging to Next.js API routes and server components
- **Do not** attempt to use file logging in client-side code
- Client-side logging should remain as console output (browser handles it)

**Detection**:

```javascript
// Only initialize file logging if running on server
if (typeof window === "undefined") {
  // Server-side: Initialize Winston with file transport
} else {
  // Client-side: Use console only (no Winston needed)
}
```

### Child Process Scripts

**Implementation**:

```javascript
// Detect if running as child process
const isChildProcess = process.send !== undefined;

if (isChildProcess) {
  // Use console transport only, even in production
  // Parent will capture stdout
} else {
  // Use standard parent process configuration
}
```

**Process Identification**:

```javascript
// Add process metadata to all child logs
const processId = `${process.env.APP_NAME}:worker:${process.pid}`;
// Include in log format
```

## Winston Configuration Template

### Parent Process (Production)

```javascript
const winston = require("winston");
const path = require("path");

const isProduction = process.env.NODE_ENV === "production";
const appName = process.env.APP_NAME || "app";
const logDir = process.env.PATH_TO_LOGS || "./logs";
const maxSize = parseInt(process.env.LOG_MAX_SIZE) || 10485760; // 10MB
const maxFiles = parseInt(process.env.LOG_MAX_FILES) || 10;

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? " " + JSON.stringify(meta) : "";
    return `[${timestamp}] [${level.toUpperCase()}] [${appName}] ${message}${metaStr}`;
  })
);

// Create logger
const logger = winston.createLogger({
  level: isProduction ? "info" : "debug",
  format: logFormat,
  transports: [],
});

// Add transports based on environment
if (isProduction) {
  logger.add(
    new winston.transports.File({
      filename: path.join(logDir, `${appName}.log`),
      maxsize: maxSize,
      maxFiles: maxFiles,
      tailable: true,
    })
  );
} else {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

// Monkey-patch console methods
console.log = (...args) => logger.info(args.join(" "));
console.error = (...args) => logger.error(args.join(" "));
console.warn = (...args) => logger.warn(args.join(" "));
console.info = (...args) => logger.info(args.join(" "));
console.debug = (...args) => logger.debug(args.join(" "));

module.exports = logger;
```

### Child Process (All Environments)

```javascript
const winston = require("winston");

const appName = process.env.APP_NAME || "app";
const processId = `${appName}:worker:${process.pid}`;

// Always use console transport for child processes
const logger = winston.createLogger({
  level: "debug",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaStr = Object.keys(meta).length
        ? " " + JSON.stringify(meta)
        : "";
      return `[${timestamp}] [${level.toUpperCase()}] [${processId}] ${message}${metaStr}`;
    })
  ),
  transports: [new winston.transports.Console()],
});

// Monkey-patch console methods
console.log = (...args) => logger.info(args.join(" "));
console.error = (...args) => logger.error(args.join(" "));
console.warn = (...args) => logger.warn(args.join(" "));
console.info = (...args) => logger.info(args.join(" "));
console.debug = (...args) => logger.debug(args.join(" "));

module.exports = logger;
```

## Migration Path

### Timeline

1. **Immediate**: Implement monkey-patching approach

   - Add Winston dependency
   - Create logger initialization module
   - Require logger at application entry point
   - Test in development and production

2. **Short-term** (as code is modified):

   - Replace critical `console.*` calls with `logger.*` in error handling
   - Update new code to use `logger.*` directly
   - Add structured metadata to important log statements

3. **Long-term** (during major refactoring):
   - Systematically replace all `console.*` with `logger.*`
   - Remove monkey-patching code
   - Enhance logging with contextual metadata

### Migration Example

```javascript
// Phase 1: Existing code (monkey-patched)
console.log("User logged in:", email);
// Output: [timestamp] [INFO] [app] User logged in: user@example.com

// Phase 2: Direct logger usage with structured data
logger.info("User logged in", { email, userId, ip: req.ip });
// Output: [timestamp] [INFO] [app] User logged in { "email": "user@example.com", "userId": 123, "ip": "192.168.1.1" }
```

## Testing

### Verification Steps

1. **Development Mode**:

   - Start application with `NODE_ENV=development`
   - Verify logs appear in console
   - Verify no log files are created
   - Check colorized output

2. **Production Mode**:

   - Start application with `NODE_ENV=production` and `PATH_TO_LOGS` set
   - Verify log files are created in specified directory
   - Verify file rotation occurs at size limit
   - Check no console output

3. **Child Processes**:

   - Spawn child process from parent
   - Verify child logs to stdout
   - Verify parent captures and logs child output
   - Check process ID appears in logs

4. **Error Handling**:
   - Test with invalid `PATH_TO_LOGS`
   - Test with no write permissions
   - Verify graceful fallback to console

## Best Practices

### Do's

- Always include contextual metadata in structured logs
- Use appropriate log levels for different message types
- Log application lifecycle events (startup, shutdown, crashes)
- Log all errors with stack traces
- Include request IDs for tracing across logs
- Sanitize sensitive data (passwords, tokens) before logging

### Don'ts

- Don't log sensitive user data (passwords, credit cards, PII)
- Don't log at debug level in production for high-traffic endpoints
- Don't use synchronous file operations in logging code
- Don't catch and suppress logging errors without fallback
- Don't log entire large objects (summarize or truncate)

## Security Considerations

### Data Sanitization

```javascript
// BAD: Logging sensitive data
logger.info("User login attempt", { email, password });

// GOOD: Sanitize sensitive fields
logger.info("User login attempt", {
  email,
  passwordProvided: !!password,
});
```

### Log File Permissions

- Set restrictive permissions on log directory (750 or 700)
- Set restrictive permissions on log files (640 or 600)
- Ensure only application user and administrators can read logs
- Consider log encryption for highly sensitive applications

### Log Retention

- Define retention policy (default: 10 files)
- Implement automated cleanup of old logs
- Consider archiving logs to secure storage
- Comply with data retention regulations

## Troubleshooting

### Common Issues

**Issue**: Logs not appearing in file

- Check `NODE_ENV` is set to `production`
- Verify `PATH_TO_LOGS` directory exists and is writable
- Check application has write permissions
- Review error output for Winston initialization errors

**Issue**: Multiple processes writing to same file

- Verify child processes are configured for console output only
- Check process detection logic (`process.send` check)
- Ensure parent process captures child stdout

**Issue**: Log files growing too large

- Reduce `LOG_MAX_SIZE` environment variable
- Decrease `LOG_MAX_FILES` retention count
- Review and reduce logging verbosity
- Implement more aggressive rotation strategy

**Issue**: Performance degradation

- Ensure using asynchronous transports (Winston default)
- Reduce logging verbosity for high-traffic endpoints
- Consider using `logger.http` level for request logs and filter in production
- Profile application to identify logging bottlenecks

## Dependencies

Required npm packages:

```json
{
  "dependencies": {
    "winston": "^3.11.0",
    "winston-daily-rotate-file": "^4.7.1"
  }
}
```

Note: `winston-daily-rotate-file` is optional and only needed if switching from size-based to date-based rotation in the future.

## References

- [Winston Documentation](https://github.com/winstonjs/winston)
- [Winston Best Practices](https://github.com/winstonjs/winston/blob/master/docs/transports.md)
- [Node.js Logging Best Practices](https://nodejs.org/en/docs/guides/diagnostics/)

## Revision History

| Date       | Version | Changes                       |
| ---------- | ------- | ----------------------------- |
| 2025-12-21 | 1.0     | Initial requirements document |

---

**Document Status**: Draft
**Owner**: NewsNexus Development Team
**Last Updated**: 2025-12-21

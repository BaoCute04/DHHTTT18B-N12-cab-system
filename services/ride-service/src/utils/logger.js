/**
 * Logger Utility
 * Simple logging utility for ETA Service
 */

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_FORMAT = process.env.LOG_FORMAT || 'simple'; // simple or json

const levels = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel = levels[LOG_LEVEL] || levels.info;

/**
 * Format timestamp
 */
function getTimestamp() {
  return new Date().toISOString();
}

/**
 * Format log message
 */
function formatMessage(level, message, data = null) {
  const timestamp = getTimestamp();

  if (LOG_FORMAT === 'json') {
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...(data && { data }),
    });
  }

  // Simple format
  let output = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  if (data) {
    output += ` ${JSON.stringify(data)}`;
  }
  return output;
}

const logger = {
  debug: (message, data) => {
    if (levels.debug >= currentLevel) {
      console.log(formatMessage('debug', message, data));
    }
  },

  info: (message, data) => {
    if (levels.info >= currentLevel) {
      console.log(formatMessage('info', message, data));
    }
  },

  warn: (message, data) => {
    if (levels.warn >= currentLevel) {
      console.warn(formatMessage('warn', message, data));
    }
  },

  error: (message, data) => {
    if (levels.error >= currentLevel) {
      console.error(formatMessage('error', message, data));
    }
  },

  setLevel: (level) => {
    // Allow runtime level changes
    if (levels[level] !== undefined) {
      currentLevel = levels[level];
      logger.info(`Log level changed to ${level}`);
    }
  },
};

module.exports = logger;

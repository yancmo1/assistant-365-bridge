/**
 * Structured Logger Utility
 * Provides consistent logging format across the application
 */

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL || 'info'];

function formatTimestamp() {
  return new Date().toISOString();
}

function formatMessage(level, component, message, data = null) {
  const base = {
    timestamp: formatTimestamp(),
    level: level.toUpperCase(),
    component,
    message
  };
  
  if (data) {
    base.data = data;
  }
  
  return base;
}

export const logger = {
  error(component, message, data = null) {
    if (currentLevel >= LOG_LEVELS.error) {
      const formatted = formatMessage('error', component, message, data);
      console.error(`❌ [${formatted.timestamp}] [${component}] ${message}`, data ? JSON.stringify(data) : '');
    }
  },
  
  warn(component, message, data = null) {
    if (currentLevel >= LOG_LEVELS.warn) {
      const formatted = formatMessage('warn', component, message, data);
      console.warn(`⚠️  [${formatted.timestamp}] [${component}] ${message}`, data ? JSON.stringify(data) : '');
    }
  },
  
  info(component, message, data = null) {
    if (currentLevel >= LOG_LEVELS.info) {
      const formatted = formatMessage('info', component, message, data);
      console.log(`ℹ️  [${formatted.timestamp}] [${component}] ${message}`, data ? JSON.stringify(data) : '');
    }
  },
  
  debug(component, message, data = null) {
    if (currentLevel >= LOG_LEVELS.debug) {
      const formatted = formatMessage('debug', component, message, data);
      console.log(`🔍 [${formatted.timestamp}] [${component}] ${message}`, data ? JSON.stringify(data) : '');
    }
  },
  
  // Special method for request logging
  request(requestId, action, details = {}) {
    const message = `[${requestId}] ${action}`;
    console.log(`📥 [${formatTimestamp()}] [REQUEST] ${message}`, Object.keys(details).length ? JSON.stringify(details) : '');
  },
  
  // Special method for response logging
  response(requestId, status, details = {}) {
    const emoji = status === 'success' ? '✅' : status === 'error' ? '❌' : '📤';
    const message = `[${requestId}] ${status.toUpperCase()}`;
    console.log(`${emoji} [${formatTimestamp()}] [RESPONSE] ${message}`, Object.keys(details).length ? JSON.stringify(details) : '');
  },
  
  // Security logging
  security(action, details = {}) {
    console.log(`🔒 [${formatTimestamp()}] [SECURITY] ${action}`, Object.keys(details).length ? JSON.stringify(details) : '');
  }
};

export default logger;

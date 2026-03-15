function generateCorrelationId() {
  const timestamp = Math.floor(Date.now() / 1e3).toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `cs-${timestamp}-${random}`;
}
function formatError(error) {
  if (!error)
    return void 0;
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name
    };
  }
  return { message: String(error) };
}
function createLogEntry(level, message, metadata) {
  const entry = {
    level,
    message,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (metadata) {
    const { correlationId, context, error, ...rest } = metadata;
    if (correlationId)
      entry.correlationId = String(correlationId);
    if (context)
      entry.context = String(context);
    if (error)
      entry.error = formatError(error);
    Object.assign(entry, rest);
  }
  return entry;
}
const log = {
  /**
   * Debug-level log (development only)
   */
  debug(message, metadata) {
    const entry = createLogEntry("debug", message, metadata);
    console.debug(JSON.stringify(entry));
  },
  /**
   * Info-level log (normal operations)
   */
  info(message, metadata) {
    const entry = createLogEntry("info", message, metadata);
    console.info(JSON.stringify(entry));
  },
  /**
   * Warning-level log (potential issues)
   */
  warn(message, metadata) {
    const entry = createLogEntry("warn", message, metadata);
    console.warn(JSON.stringify(entry));
  },
  /**
   * Error-level log (failures)
   */
  error(message, metadata) {
    const entry = createLogEntry("error", message, metadata);
    console.error(JSON.stringify(entry));
  },
  /**
   * Create a child logger with bound context
   *
   * @example
   * const reqLog = log.child({ correlationId, path: '/api/users' });
   * reqLog.info('Request started');
   * reqLog.error('Request failed', { error: err });
   */
  child(context) {
    return {
      debug: (message, metadata) => log.debug(message, { ...context, ...metadata }),
      info: (message, metadata) => log.info(message, { ...context, ...metadata }),
      warn: (message, metadata) => log.warn(message, { ...context, ...metadata }),
      error: (message, metadata) => log.error(message, { ...context, ...metadata })
    };
  }
};
function logError(context, error, correlationId, metadata) {
  log.error(context, {
    correlationId,
    error,
    ...metadata
  });
}
export {
  logError as a,
  generateCorrelationId as g,
  log as l
};

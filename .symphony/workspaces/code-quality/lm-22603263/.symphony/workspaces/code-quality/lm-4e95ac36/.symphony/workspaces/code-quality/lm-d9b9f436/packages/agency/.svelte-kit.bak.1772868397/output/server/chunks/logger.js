import { g as generateCorrelationId, l as log } from "./errors.js";
function createLogger(service, context = {}) {
  const baseContext = {
    service,
    ...context
  };
  if (!baseContext.correlationId) {
    baseContext.correlationId = generateCorrelationId();
  }
  const formatMessage = (message) => `[${service}] ${message}`;
  return {
    debug(message, metadata) {
      log.debug(formatMessage(message), { ...baseContext, ...metadata });
    },
    info(message, metadata) {
      log.info(formatMessage(message), { ...baseContext, ...metadata });
    },
    warn(message, metadata) {
      log.warn(formatMessage(message), { ...baseContext, ...metadata });
    },
    error(message, metadata) {
      log.error(formatMessage(message), { ...baseContext, ...metadata });
    },
    child(additionalContext) {
      return createLogger(service, { ...baseContext, ...additionalContext });
    },
    getCorrelationId() {
      return baseContext.correlationId;
    }
  };
}
function extractErrorDetails(metadata) {
  if (!metadata?.error) {
    return { errorName: null, errorMessage: null, stackTrace: null };
  }
  const err = metadata.error;
  if (err instanceof Error) {
    return {
      errorName: err.name,
      errorMessage: err.message,
      stackTrace: err.stack || null
    };
  }
  if (typeof err === "object" && err !== null) {
    const errObj = err;
    return {
      errorName: errObj.name || null,
      errorMessage: errObj.message || null,
      stackTrace: errObj.stack || null
    };
  }
  return {
    errorName: null,
    errorMessage: String(err),
    stackTrace: null
  };
}
async function persistErrorToD1(db, level, service, message, context, metadata) {
  try {
    const { errorName, errorMessage, stackTrace } = extractErrorDetails(metadata);
    const cleanMetadata = metadata ? { ...metadata } : {};
    delete cleanMetadata.error;
    await db.prepare(`INSERT INTO agent_error_logs (
					level, service, message, correlation_id, path, method, user_id,
					metadata, error_name, error_message, stack_trace, resolution_status
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')`).bind(level, service, message, context.correlationId || null, context.path || null, context.method || null, context.userId || null, Object.keys(cleanMetadata).length > 0 ? JSON.stringify(cleanMetadata) : null, errorName, errorMessage, stackTrace).run();
  } catch (persistError) {
    console.error("[Logger] Failed to persist error to D1:", persistError);
  }
}
function createPersistentLogger(service, options, context = {}) {
  const { db, waitUntil, minPersistLevel = "warn" } = options;
  const baseContext = {
    service,
    ...context
  };
  if (!baseContext.correlationId) {
    baseContext.correlationId = generateCorrelationId();
  }
  const formatMessage = (message) => `[${service}] ${message}`;
  const shouldPersist = (level) => {
    if (minPersistLevel === "error") {
      return level === "error";
    }
    return true;
  };
  const persistIfNeeded = (level, message, metadata) => {
    if (!shouldPersist(level))
      return;
    const persistPromise = persistErrorToD1(db, level, service, message, baseContext, metadata);
    if (waitUntil) {
      waitUntil(persistPromise);
    } else {
      persistPromise.catch(() => {
      });
    }
  };
  return {
    debug(message, metadata) {
      log.debug(formatMessage(message), { ...baseContext, ...metadata });
    },
    info(message, metadata) {
      log.info(formatMessage(message), { ...baseContext, ...metadata });
    },
    warn(message, metadata) {
      log.warn(formatMessage(message), { ...baseContext, ...metadata });
      persistIfNeeded("warn", message, metadata);
    },
    error(message, metadata) {
      log.error(formatMessage(message), { ...baseContext, ...metadata });
      persistIfNeeded("error", message, metadata);
    },
    child(additionalContext) {
      return createPersistentLogger(service, options, { ...baseContext, ...additionalContext });
    },
    getCorrelationId() {
      return baseContext.correlationId;
    }
  };
}
({
  /** Auth-related logging */
  auth: createLogger("Auth"),
  /** API endpoint logging */
  api: createLogger("API"),
  /** Database operation logging */
  db: createLogger("Database"),
  /** External service logging */
  external: createLogger("External"),
  /** Background job logging */
  jobs: createLogger("Jobs")
});
export {
  createPersistentLogger as a,
  createLogger as c
};

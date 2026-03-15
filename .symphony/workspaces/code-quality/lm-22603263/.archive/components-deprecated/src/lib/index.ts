// Main library exports
// Re-export all components, utils, types, tokens, and patterns

// Components
export * from './components/index.js';

// Utils (excluding clipboard which conflicts with diagrams export)
export {
    markExperimentCompleted,
    isExperimentCompleted,
    clearExperimentCompletion,
    validateCompletionToken,
    fetchPublishedPapers,
    fetchPaperBySlug,
    fetchRelatedPapers,
    fetchPapersByCategory,
    fetchCategoryStats,
    fetchExperimentStats,
    safeQuery,
    query,
    insert,
    update,
    QueryBuilder,
    InsertBuilder,
    UpdateBuilder,
    PAPER_COLUMNS,
    trackLearningEvent,
    trackLearningEvents,
    io,
    space,
    ltd,
    agency,
    // Validation utilities
    isValidEmail,
    normalizeEmail,
    isValidPhone,
    normalizePhone,
    sanitizeHtml,
    isValidUrl,
    isEmpty,
    hasItems,
    hasOne,
    first,
    validateStringField,
    validateStringFields,
    // Error handling
    generateCorrelationId,
    createErrorResponse,
    logError,
    log,
    // API error handling
    handleApiError,
    catchApiError,
    ApiError,
    ValidationError,
    NotFoundError,
    UnauthorizedError,
    ForbiddenError,
    assertApi,
    assertAuth,
    assertFound,
    apiSuccess,
    apiError,
    // Logging utilities
    createLogger,
    createRequestLogger,
    createTimer,
    logDuration,
    loggers,
    // Tracing
    generateTraceId,
    generateSpanId,
    parseTraceparent,
    formatTraceparent,
    createTraceContext,
    createChildContext,
    createSpan,
    endSpan,
    setSpanAttribute,
    addSpanEvent,
    extractTraceContext,
    injectTraceContext,
    formatSpanForLogging,
    trace,
    createTracer,
    formatPageMarkdown,
    generateClaudeUrl,
    truncateForUrl,
    copyToClipboard,
    // String utilities
    slugify,
    camelCase,
    kebabCase,
    truncate,
    escapeXml,
    // Types
    type CategoryStat,
    type CategoryRow,
    type ExperimentStats,
    type QueryResult,
    type PropertyId,
    type LearningEvent,
    type LearningEventMetadata,
    type LearningEventResponse,
    type ErrorResponse,
    type LogLevel,
    type LogEntry,
    type TraceContext,
    type Span,
    type SpanEvent,
    type PageMetadata,
    type StringFieldOptions,
    type StringFieldResult,
    type ApiErrorResponse,
    type ApiHandler,
    type HandleErrorOptions,
    type Logger,
    type LoggerContext
} from './utils/index.js';

// API Clients
export * from './api/index.js';

// Types
export * from './types/index.js';

// Tokens (design system foundation)
export * from './tokens/index.js';

// ASCII Art (visual identity)
export * from './ascii/index.js';

// Visual Canon (isometric primitives and animations)
export * from './visual/index.js';

// Actions (Svelte use: directives)
export * from './actions/index.js';

// Brand (marks, loaders, social assets)
export * from './brand/index.js';

// Newsletter (subscription and unsubscribe)
export * from './newsletter/index.js';

// Icons (Canon icon system)
export * from './icons/index.js';

// Patterns (composition recipes)
export * from './patterns/index.js';

// Diagrams (data visualization)
export * from './diagrams/index.js';

// Insights (shareable key insight visuals)
export * from './insights/index.js';

// Navigation (headers, drawers, search)
export * from './navigation/index.js';

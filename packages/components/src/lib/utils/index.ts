// Utility exports
export {
    markExperimentCompleted,
    isExperimentCompleted,
    clearExperimentCompletion,
    validateCompletionToken
} from './completion.js';

// D1 Database helpers and query builders
export {
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
    type CategoryStat,
    type CategoryRow,
    type ExperimentStats,
    type QueryResult
} from './db.js';

// Design tokens
export * from '../tokens/index.js';

// Learning event tracking
export {
    trackLearningEvent,
    trackLearningEvents,
    io,
    space,
    ltd,
    agency,
    type PropertyId,
    type LearningEvent,
    type LearningEventMetadata,
    type LearningEventResponse
} from './learning.js';

// Validation utilities
export {
    isValidEmail,
    normalizeEmail,
    isValidPhone,
    normalizePhone,
    sanitizeHtml,
    isValidUrl,
    // Array helpers
    isEmpty,
    hasItems,
    hasOne,
    first,
    // String field validation
    validateStringField,
    validateStringFields,
    type StringFieldOptions,
    type StringFieldResult
} from './validation.js';

// Error handling and structured logging
export {
    generateCorrelationId,
    createErrorResponse,
    logError,
    log,
    type ErrorResponse,
    type LogLevel,
    type LogEntry
} from './errors.js';

// API error handling utilities
export {
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
    type ApiErrorResponse,
    type ApiHandler,
    type HandleErrorOptions
} from './api-error.js';

// Context-aware logging
export {
    createLogger,
    createPersistentLogger,
    createRequestLogger,
    createTimer,
    logDuration,
    loggers,
    type Logger,
    type LoggerContext
} from './logger.js';

// Distributed tracing (W3C Trace Context compatible)
export {
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
    type TraceContext,
    type Span,
    type SpanEvent
} from './tracing.js';

// Markdown formatting and export
export {
    formatPageMarkdown,
    generateClaudeUrl,
    truncateForUrl,
    type PageMetadata
} from './markdown.js';

// Clipboard utilities (text copying - not diagram export)
// For diagram export, use copyDiagramToClipboard from diagrams/export.ts
export { copyToClipboard } from './clipboard.js';

// Content loader types (implementations in each package)
export type {
	BaseFrontmatter,
	PaperFrontmatter,
	PatternFrontmatter,
	CanonFrontmatter,
	WorkFrontmatter,
	ContentItem
} from './content-loader.js';

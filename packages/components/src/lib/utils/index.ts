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
    isValidUrl
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
// Note: clipboard utilities not exported here to avoid conflict with diagrams/export.ts
// Import directly from '@create-something/components/utils/clipboard' if needed
export {
    formatPageMarkdown,
    generateClaudeUrl,
    truncateForUrl,
    type PageMetadata
} from './markdown.js';

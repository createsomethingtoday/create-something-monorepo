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
export {
    formatPageMarkdown,
    generateClaudeUrl,
    truncateForUrl,
    type PageMetadata
} from './markdown.js';

// Clipboard utilities (text copying - not diagram export)
// For diagram export, use copyDiagramToClipboard from diagrams/export.ts
export { copyToClipboard } from './clipboard.js';

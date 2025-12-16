// Utility exports
export {
    markExperimentCompleted,
    isExperimentCompleted,
    clearExperimentCompletion,
    validateCompletionToken
} from './completion.js';

// D1 Database helpers
export {
    fetchPublishedPapers,
    fetchPaperBySlug,
    fetchRelatedPapers,
    fetchPapersByCategory,
    fetchCategoryStats,
    fetchExperimentStats,
    safeQuery,
    PAPER_COLUMNS,
    type CategoryStat,
    type CategoryRow,
    type ExperimentStats
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

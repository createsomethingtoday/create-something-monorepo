/**
 * @create-something/orchestration
 *
 * Multi-session orchestration layer with quality gates and cost tracking.
 *
 * Philosophy: Extends harness patterns with multi-session durability.
 * The infrastructure recedes; only the work remains.
 */

// Session management
export {
  startSession,
  pauseSession,
  resumeSession,
  completeSession,
  checkCheckpointTrigger,
} from './session/lifecycle.js';

export {
  createSessionContext,
  updateSessionCost,
  isBudgetExceeded,
  getBudgetStatus,
  generateSessionId,
  generateEpicId,
} from './session/context.js';

// Checkpoint storage
export {
  saveCheckpoint,
  loadLatestCheckpoint,
  loadCheckpoint,
  listCheckpoints,
  hasCheckpoints,
  deleteEpicCheckpoints,
} from './checkpoint/store.js';

// Checkpoint policy
export {
  shouldCheckpoint,
  getCheckpointIntervalMs,
  getNextCheckpointTime,
  formatCheckpointReason,
} from './checkpoint/policy.js';

// Resume briefs
export {
  generateResumeBrief,
  formatCheckpointSummary,
  hasResumableContext,
} from './checkpoint/brief.js';

// Harness integration
export {
  runBaseline,
  baselinePassed,
  formatBaselineResult,
} from './integration/harness.js';

// Convoy coordination
export {
  createConvoy,
  loadConvoy,
  saveConvoy,
  listConvoys,
  getConvoyStatus,
  updateConvoyStatus,
  deleteConvoy,
  generateConvoyId,
} from './coordinator/convoy.js';

// Worker pool
export {
  spawnWorker,
  spawnWorkers,
  readWorkerSignal,
  writeWorkerSignal,
  pollWorkerStatus,
  checkWorkerHealth,
  terminateWorker,
  listWorkers,
  generateWorkerId,
} from './coordinator/worker-pool.js';

// Cost tracking
export {
  createCostTracker,
  recordSessionCost,
  recordWorkerCost,
  getConvoyCost,
  getRemainingBudget,
  isBudgetExceeded as isBudgetExceededConvoy,
  getBudgetWarningThreshold,
  aggregateCosts,
  getWorkerCostBreakdown,
  getSessionCostBreakdown,
  estimateRemainingCost,
  wouldExceedBudget,
} from './cost/tracker.js';

export type { CostSummary } from './cost/tracker.js';

// Cost reporting
export {
  generateConvoyReport,
  generateEpicReport,
  formatConvoyReport,
  formatEpicReport,
  formatCostSummary,
} from './cost/report.js';

export type { ConvoyCostReport, EpicCostReport } from './cost/report.js';

// Beads integration
export {
  labelConvoyIssues,
  getConvoyIssues,
  updateIssueOnCompletion,
  createBlockerIssue,
  getIssue,
  getIssues,
  isIssueBlocked,
  getReadyIssues,
} from './integration/beads.js';

// Reflection and learning
export {
  analyzeConvoy,
  analyzeEpic,
  identifyCorrections,
  identifyFailurePatterns,
  extractLearnings,
  saveReflection,
  loadReflection,
  listReflections,
  applyLearning,
  applyAllLearnings,
  getPendingLearningSummary,
  generateLearningsReport,
  DEFAULT_REFLECTION_CONFIG,
} from './reflection/index.js';

export type {
  Learning,
  LearningType,
  LearningSource,
  ReflectionResult,
  ReflectionTarget,
  ReflectionStats,
  IssueMetrics,
  ReflectionConfig,
  StoredReflection,
} from './reflection/index.js';

// Postmortem analysis
export {
  createPostmortem,
  analyzeRootCause,
  generatePreventionRules,
  savePostmortem,
  loadPostmortem,
  listPostmortems,
  updatePostmortemStatus,
  applyPreventionRule,
  applyAllRules,
  formatPostmortemReport,
  DEFAULT_POSTMORTEM_CONFIG,
} from './postmortem/index.js';

export type {
  Postmortem,
  RootCause,
  RootCauseCategory,
  Impact,
  TimelineEvent,
  PreventionRule,
  PostmortemStatus,
  PostmortemConfig,
  StoredPostmortem,
} from './postmortem/index.js';

// Metrics tracking
export {
  collectIssueMetrics,
  collectConvoyMetrics,
  collectEpicMetrics,
  computeAggregateMetrics,
  computeTrends,
  saveMetrics,
  loadMetrics,
  listMetrics,
  generateMetricsReport,
  EMPTY_REVIEWER_FINDINGS,
} from './metrics/index.js';

export type {
  WorkMetrics,
  ReviewerFindings,
  FindingsSummary,
  AggregateMetrics,
  ComplexityMetrics,
  MetricsTrend,
  TrendDataPoint,
  StoredMetrics,
} from './metrics/index.js';

// Types
export type {
  OrchestrationContext,
  StoredCheckpoint,
  SessionConfig,
  SessionStatus,
  Session,
  CheckpointPolicy,
  CostTracker,
  Convoy,
  WorkerStatus,
  StoredConvoy,
  WorkerSignal,
  ConvoyCostTracker,
  HealthReport,
  ConvoyStatus,
  WorkerConfig,
} from './types.js';

export { DEFAULT_CHECKPOINT_POLICY } from './types.js';

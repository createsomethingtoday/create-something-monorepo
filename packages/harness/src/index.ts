/**
 * @create-something/harness
 *
 * Autonomous agent harness with Beads-based human oversight.
 * Runs Claude Code sessions in a loop with progress reports and reactive redirection.
 *
 * Philosophy: The harness recedes into transparent operation.
 * Humans engage through progress reports—reactive steering rather than proactive management.
 * "Weniger, aber besser." — Dieter Rams
 */

// Types
export type {
  Feature,
  ParsedSpec,
  DependencyGraph,
  BeadsIssue,
  HarnessStatus,
  CheckpointPolicy,
  HarnessState,
  Checkpoint,
  SessionOutcome,
  SessionResult,
  Redirect,
  PrimingContext,
  StartOptions,
  ResumeOptions,
  PauseOptions,
  // Failure handling types
  FailureHandlingConfig,
  FailureStrategies,
  FailureAction,
  FailureRecord,
  FailureAttempt,
  FailureDecision,
  // Swarm types
  SwarmConfig,
  SwarmAgentStatus,
  SwarmProgress,
  SwarmCheckpoint,
  // Model detection types
  ClaudeModelFamily,
  DetectedModel,
  ModelSpecificConfig,
  // Peer review types
  ReviewerType,
  FindingSeverity,
  ReviewOutcome,
  ReviewFinding,
  ReviewResult,
  ReviewerConfig,
  ReviewPipelineConfig,
  ReviewAggregation,
  ReviewContext,
  ReviewedCheckpoint,
} from './types.js';

export {
  DEFAULT_CHECKPOINT_POLICY,
  DEFAULT_FAILURE_HANDLING_CONFIG,
  DEFAULT_SWARM_CONFIG,
  DEFAULT_MODEL_SPECIFIC_CONFIG,
  DEFAULT_REVIEW_PIPELINE_CONFIG,
} from './types.js';

// Spec Parser
export {
  parseSpec,
  formatSpecSummary,
  getStartableFeatures,
  getNextBatch,
  analyzeDependencyGraph,
} from './spec-parser.js';

// Beads Integration
export {
  readAllIssues,
  getOpenIssues,
  getIssue,
  createIssue,
  updateIssueStatus,
  updateIssuePriority,
  addDependency,
  getReadyIssues,
  createHarnessIssue,
  createCheckpointIssue,
  createIssuesFromFeatures,
  getIssuesChangedSince,
  checkForPauseRequest,
} from './beads.js';

// Session Management
export {
  generatePrimingPrompt,
  runSession,
  getRecentCommits,
  createHarnessBranch,
} from './session.js';

// Checkpoints
export {
  createCheckpointTracker,
  recordSession,
  shouldCreateCheckpoint,
  calculateConfidence,
  shouldPauseForConfidence,
  generateCheckpoint,
  generateReviewedCheckpoint,
  resetTracker,
  formatCheckpointDisplay,
  // Swarm batch tracking
  startSwarmBatch,
  registerSwarmAgent,
  updateSwarmAgentStatus,
  completeSwarmBatch,
  getCurrentSwarmProgress,
  hasActiveSwarmBatch,
  generateSwarmCheckpoint,
  formatSwarmProgressDisplay,
} from './checkpoint.js';

// Redirect Detection
export {
  takeSnapshot,
  detectChanges,
  checkForRedirects,
  formatRedirectNotes,
  getUrgentRedirect,
  requiresImmediateAction,
  logRedirect,
} from './redirect.js';

// Runner
export {
  initializeHarness,
  runHarness,
  resumeHarness,
  pauseHarness,
  getHarnessStatus,
  runParallelSessions,
} from './runner.js';

// Failure Handling
export {
  createFailureTracker,
  makeFailureDecision,
  recordSuccessfulRetry,
  shouldRetry,
  getAttemptCount,
  formatFailureAnnotation,
  getFailureStats,
  formatFailureStats,
} from './failure-handler.js';

// Model Detection
export {
  parseModelFromOutput,
  parseModelId,
  formatModelInfo,
  getModelConfidenceThreshold,
  isModelContextSensitive,
} from './model-detector.js';

// Peer Review - Prompts
export {
  getPromptForReviewer,
  SECURITY_REVIEWER_PROMPT,
  ARCHITECTURE_REVIEWER_PROMPT,
  QUALITY_REVIEWER_PROMPT,
} from './reviewer-prompts.js';

// Peer Review - Reviewer Execution
export {
  generateReviewPrompt,
  runReviewer,
  filterFindingsBySeverity,
  getOutcomeIcon,
} from './reviewer.js';

// Peer Review - Pipeline
export {
  buildReviewContext,
  runReviewPipeline,
  aggregateReviewResults,
  formatReviewDisplay,
  formatFindingsReport,
} from './review-pipeline.js';

// Peer Review - Beads Integration
export {
  createReviewIssue,
  createFindingIssues,
  getReviewSummaryLine,
} from './review-beads.js';

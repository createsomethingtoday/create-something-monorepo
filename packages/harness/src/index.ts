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
} from './types.js';

export {
  DEFAULT_CHECKPOINT_POLICY,
  DEFAULT_FAILURE_HANDLING_CONFIG,
  DEFAULT_SWARM_CONFIG,
} from './types.js';

// Spec Parser
export { parseSpec, formatSpecSummary } from './spec-parser.js';

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

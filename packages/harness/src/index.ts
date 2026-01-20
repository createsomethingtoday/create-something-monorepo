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
  // Discovery source taxonomy (upstream from VC)
  DiscoverySource,
  // Beads seed types (Bloom-inspired)
  BeadsIssueSeed,
  // Agent context types (upstream from VC - nondeterministic idempotence)
  AgentContext,
  FileModification,
  IssueUpdate,
  TaskProgress,
  TestState,
  Decision,
  // Self-healing baseline types (upstream from VC)
  QualityGateType,
  BaselineConfig,
  BaselineGate,
  BaselineResult,
  BaselineHealth,
} from './types.js';

// Model Organisms (Bloom-inspired validation framework)
export type {
  OrganismComplexity,
  ModelOrganism,
  OrganismValidation,
  OrganismSuite,
  RoutingMetrics,
} from './model-organisms.js';

export {
  STANDARD_ORGANISMS,
  organismToBeadsIssue,
  isModelOrganism,
  getOrganismMetadata,
  validateRouting,
  calculateRoutingMetrics,
  formatRoutingMetrics,
  createStandardSuite,
  createMinimalSuite,
} from './model-organisms.js';

export {
  DEFAULT_CHECKPOINT_POLICY,
  DEFAULT_FAILURE_HANDLING_CONFIG,
  DEFAULT_SWARM_CONFIG,
  DEFAULT_MODEL_SPECIFIC_CONFIG,
  DEFAULT_REVIEW_PIPELINE_CONFIG,
  // Discovery source taxonomy
  DISCOVERY_LABELS,
  getDiscoveryLabel,
  // Beads seed helpers (Bloom-inspired)
  hasExecutableSeed,
  getIssueSeed,
  // Agent context
  EMPTY_AGENT_CONTEXT,
  // Self-healing baseline
  DEFAULT_BASELINE_CONFIG,
} from './types.js';

// Spec Parser
export {
  parse,
  parseSpec,
  formatSpecSummary,
  getStartableFeatures,
  getNextBatch,
  analyzeDependencyGraph,
  // YAML spec parser utilities
  parseYamlSpec,
  isYamlSpec,
  SpecValidationError,
  generateYamlFromMarkdown,
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
  // Work Extraction (upstream from VC)
  createIssueFromFinding,
  extractWorkFromFindings,
  // Convenience functions for discovery sources
  createBlockerIssue,
  createSelfHealIssue,
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
  // Agent context management (upstream from VC - nondeterministic idempotence)
  recordFileModification,
  recordIssueUpdate,
  updateTaskProgress,
  recordTestState,
  addAgentNotes,
  recordBlocker,
  recordDecision,
  getAgentContext,
  clearAgentContext,
  loadAgentContext,
  restoreAgentContext,
  generateResumeBrief,
  hasResumableContext,
  formatAgentContextSummary,
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

// Model Routing
export type {
  RoutingDecision,
  ComplexityAnalysis,
  ModelSuggestion,
} from './model-routing.js';

export {
  selectModel,
  analyzeComplexity,
  getCostEstimate,
  formatRoutingDecision,
  validateModelSelection,
  suggestModelImprovement,
} from './model-routing.js';

// Routing Experiments
export type {
  RoutingExperiment,
  ExperimentStats,
} from './routing-experiments.js';

export {
  logExperiment,
  readExperiments,
  calculateStats,
  generateReport,
  exportToCSV,
  quickLog,
  printLatestExperiments,
} from './routing-experiments.js';

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
  convertDefinitionToConfig,
} from './reviewer.js';

// Peer Review - Pipeline
export {
  buildReviewContext,
  runReviewPipeline,
  aggregateReviewResults,
  formatReviewDisplay,
  formatFindingsReport,
} from './review-pipeline.js';

// Peer Review - Meta-Review (Bloom-inspired)
export type {
  MetaReviewResult,
  CrossCuttingPattern,
  DiscoveredIssue,
  MetaReviewConfig,
} from './meta-review.js';

export {
  runMetaReview,
  selectMetaReviewModel,
  formatMetaReviewDisplay,
  DEFAULT_META_REVIEW_CONFIG,
} from './meta-review.js';

// Peer Review - Beads Integration
export {
  createReviewIssue,
  createFindingIssues,
  getReviewSummaryLine,
} from './review-beads.js';

// Self-Healing Baseline (upstream from VC)
export {
  runQualityGate,
  runBaselineCheck,
  attemptAutoFix,
  createBaselineBlocker,
  formatBaselineDisplay,
  createBaselineHealth,
  updateBaselineHealth,
  formatBaselineHealth,
  canProceedWithWork,
  getBaselineBlockers,
  runConfiguredGates,
  runCustomGate,
  attemptCustomAutoFix,
} from './self-heal.js';

// Circuit Breaker Pattern
export type {
  CircuitState,
  CircuitBreakerConfig,
  CircuitMetrics,
  CircuitResult,
} from './circuit-breaker.js';

export {
  CircuitBreaker,
  circuitBreakers,
  withCircuitBreaker,
  formatCircuitBreakerReport,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
} from './circuit-breaker.js';

// Saga Pattern
export type {
  SagaStepStatus,
  SagaStatus,
  SagaStepResult,
  SagaResult,
  SagaStep,
  SagaConfig,
} from './saga.js';

export {
  SagaOrchestrator,
  SagaBuilder,
  saga,
  formatSagaResult,
  needsManualIntervention,
  getFailedCompensations,
  DEFAULT_SAGA_CONFIG,
} from './saga.js';

// Runtime Configuration (Gas Town v0.2.2+ multi-provider support)
export type {
  RuntimeProvider,
  PromptMode,
  RuntimeConfig,
  AgentPreset,
  SettingsConfig,
} from './runtime-config.js';

export {
  BUILT_IN_PRESETS,
  DEFAULT_RUNTIME_CONFIG,
  DEFAULT_SETTINGS_CONFIG,
  loadRuntimeConfig,
  saveRuntimeConfig,
  resolveAgent,
  buildRuntimeCommand,
  formatRuntime,
} from './runtime-config.js';

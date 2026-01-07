/**
 * @create-something/harness
 *
 * Types for the autonomous agent harness.
 * Beads-based human oversight with progress reports and reactive redirection.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Spec & Features
// ─────────────────────────────────────────────────────────────────────────────

export interface Feature {
  id: string;
  title: string;
  description: string;
  complexity?: 'trivial' | 'simple' | 'standard' | 'complex';
  priority: number; // 0-4 (P0=highest)
  dependsOn: string[]; // Feature IDs this depends on
  blockedBy: string[]; // Feature IDs that block this one (reverse of dependsOn)
  isIndependent: boolean; // True if no dependencies - can run in parallel
  acceptanceCriteria: string[];
  labels: string[];
  /** Files expected to be modified (YAML spec only) */
  files?: string[];
}

export interface ParsedSpec {
  title: string;
  overview: string;
  features: Feature[];
  /** Features with no dependencies that can be executed in parallel */
  independentFeatures: Feature[];
  /** Dependency graph metadata for swarm orchestration */
  dependencyGraph: DependencyGraph;
  /** Target CREATE SOMETHING property (YAML spec only) */
  property?: 'space' | 'io' | 'agency' | 'ltd';
  /** Complexity override for model routing (YAML spec only) */
  complexity?: 'trivial' | 'simple' | 'standard' | 'complex';
  /** Technical requirements that apply to all features (YAML spec only) */
  requirements?: string[];
  /** Success criteria for the entire project (YAML spec only) */
  successCriteria?: string[];
}

/**
 * Dependency graph metadata for analyzing task independence.
 * Used by the swarm orchestrator to determine parallel execution batches.
 */
export interface DependencyGraph {
  /** Map of feature ID to features that depend on it */
  blocksMap: Map<string, string[]>;
  /** Map of feature ID to features it depends on */
  dependsOnMap: Map<string, string[]>;
  /** Features with no dependencies (can start immediately) */
  roots: string[];
  /** Features with no dependents (end points) */
  leaves: string[];
  /** Maximum depth of the dependency chain */
  maxDepth: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Beads Integration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Discovery source taxonomy for work extraction.
 * Upstream pattern from Steve Yegge's VC project.
 *
 * Philosophy: Knowing *how* work was discovered informs priority and resolution.
 * - Blockers need immediate attention
 * - Related work can be scheduled separately
 * - Supervisor findings may batch into refactoring sessions
 */
export type DiscoverySource =
  | 'blocker'     // Blocks current work, must address immediately
  | 'related'     // Related work discovered, can be scheduled separately
  | 'supervisor'  // AI supervisor (checkpoint review) identified concern
  | 'self-heal'   // Self-healing baseline discovered issue
  | 'manual';     // Manually created during session

/**
 * Label constants for discovered work taxonomy.
 * Maps DiscoverySource to Beads labels.
 */
export const DISCOVERY_LABELS: Record<DiscoverySource, string> = {
  blocker: 'harness:blocker',
  related: 'harness:related',
  supervisor: 'harness:supervisor',
  'self-heal': 'harness:self-heal',
  manual: 'harness:discovered',
} as const;

/**
 * Get the Beads label for a discovery source.
 */
export function getDiscoveryLabel(source: DiscoverySource): string {
  return DISCOVERY_LABELS[source];
}

/**
 * Executable seed for Beads issues (Bloom-inspired pattern).
 *
 * Seeds make issues executable - they contain all the context needed
 * for Ralph/harness to directly consume and execute the issue.
 *
 * Philosophy: Issues aren't just descriptions - they're specifications.
 */
export interface BeadsIssueSeed {
  /** Behavior to achieve or measure */
  behavior: string;
  /** Example transcripts/outputs showing success */
  examples?: string[];
  /** Configuration for execution (Ralph, harness, etc.) */
  config?: {
    /** Maximum iterations for Ralph loops */
    maxIterations?: number;
    /** Model escalation strategy */
    escalation?: {
      enabled: boolean;
      initialModel?: 'haiku' | 'sonnet' | 'opus';
      escalationThreshold?: number;
    };
    /** Harness-specific config */
    harness?: {
      useRalphEscalation?: boolean;
      reviewers?: string[];
    };
  };
  /** Acceptance criteria (testable conditions) */
  acceptance?: Array<{
    /** Criterion description */
    test: string;
    /** How to verify (command or manual check) */
    verify?: string;
  }>;
  /** Completion promise string for Ralph */
  completionPromise?: string;
}

export interface BeadsIssue {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'closed';
  priority: number;
  issue_type: string;
  labels: string[];
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  /** Metadata including optional seed */
  metadata?: {
    /** Executable seed (Bloom-inspired) */
    seed?: BeadsIssueSeed;
    /** Other metadata fields */
    [key: string]: unknown;
  };
  dependencies?: Array<{
    issue_id: string;
    depends_on_id: string;
    type: string;
  }>;
}

/**
 * Check if an issue has an executable seed.
 */
export function hasExecutableSeed(issue: BeadsIssue): boolean {
  return !!issue.metadata?.seed;
}

/**
 * Get the seed from a Beads issue.
 */
export function getIssueSeed(issue: BeadsIssue): BeadsIssueSeed | undefined {
  return issue.metadata?.seed as BeadsIssueSeed | undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// Harness State
// ─────────────────────────────────────────────────────────────────────────────

export type HarnessStatus = 'initializing' | 'running' | 'paused' | 'completed' | 'failed';

export interface CheckpointPolicy {
  afterSessions: number; // Create checkpoint every N sessions
  afterHours: number; // Create checkpoint every M hours
  onError: boolean; // Create checkpoint on task failure
  onConfidenceBelow: number; // Pause if confidence drops below threshold
  onRedirect: boolean; // Create checkpoint when human redirects
}

export interface HarnessState {
  id: string;
  status: HarnessStatus;
  specFile: string;
  gitBranch: string;
  startedAt: string;
  currentSession: number;
  sessionsCompleted: number;
  featuresTotal: number;
  featuresCompleted: number;
  featuresFailed: number;
  lastCheckpoint: string | null;
  checkpointPolicy: CheckpointPolicy;
  pauseReason: string | null;
  /** Total cost across all sessions in USD */
  totalCost: number;
  /** Last session ID for continuation within same epic */
  lastSessionId: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Checkpoints
// ─────────────────────────────────────────────────────────────────────────────

export interface Checkpoint {
  id: string;
  harnessId: string;
  sessionNumber: number;
  timestamp: string;
  summary: string;
  issuesCompleted: string[];
  issuesInProgress: string[];
  issuesFailed: string[];
  gitCommit: string;
  confidence: number;
  redirectNotes: string | null;
  /** Agent context for pause/resume (nondeterministic idempotence) */
  agentContext?: AgentContext;
  /** Total cost of all sessions up to this checkpoint (USD) */
  totalCost?: number;
  /** Average cost per session (USD) */
  avgCostPerSession?: number;
  /** Last session ID for continuation across checkpoints */
  lastSessionId?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent Context (Upstream from VC - Nondeterministic Idempotence)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Agent context for pause/resume with full understanding preservation.
 * Upstream pattern from Steve Yegge's VC project.
 *
 * Philosophy: "Nondeterministic Idempotence" - workflows can be interrupted
 * and resumed anywhere. The AI figures out where it left off by loading
 * this context into its priming prompt.
 */
export interface AgentContext {
  /** Files modified in this session with summaries */
  filesModified: FileModification[];
  /** Issues touched with status changes */
  issuesUpdated: IssueUpdate[];
  /** Current task progress */
  currentTask: TaskProgress | null;
  /** Test state at checkpoint time */
  testState: TestState | null;
  /** Agent's free-form notes and observations */
  agentNotes: string;
  /** Blockers encountered during work */
  blockers: string[];
  /** Decisions made and their rationale */
  decisions: Decision[];
  /** Timestamp of context capture */
  capturedAt: string;
}

/**
 * Record of a file modification for context preservation.
 */
export interface FileModification {
  path: string;
  /** Brief summary of changes */
  summary: string;
  /** Type of change */
  changeType: 'created' | 'modified' | 'deleted' | 'renamed';
  /** Lines added (approximate) */
  linesAdded?: number;
  /** Lines removed (approximate) */
  linesRemoved?: number;
}

/**
 * Record of an issue status change.
 */
export interface IssueUpdate {
  issueId: string;
  title: string;
  fromStatus: string;
  toStatus: string;
  /** Optional reason for status change */
  reason?: string;
}

/**
 * Current task progress state.
 */
export interface TaskProgress {
  issueId: string;
  issueTitle: string;
  /** Current step description */
  currentStep: string;
  /** Progress percentage (0-100) */
  progressPercent: number;
  /** Remaining steps description */
  remainingWork: string;
  /** Time spent on this task in ms */
  timeSpentMs: number;
}

/**
 * Test state at checkpoint time.
 */
export interface TestState {
  passed: number;
  failed: number;
  skipped: number;
  /** Names of failing tests */
  failingTests: string[];
  /** Total duration of test run in ms */
  durationMs: number;
}

/**
 * Record of a decision made during work.
 */
export interface Decision {
  /** What was decided */
  decision: string;
  /** Why this choice was made */
  rationale: string;
  /** Alternatives considered */
  alternatives?: string[];
  /** Timestamp */
  madeAt: string;
}

/**
 * Default empty agent context.
 */
export const EMPTY_AGENT_CONTEXT: AgentContext = {
  filesModified: [],
  issuesUpdated: [],
  currentTask: null,
  testState: null,
  agentNotes: '',
  blockers: [],
  decisions: [],
  capturedAt: new Date().toISOString(),
};

// ─────────────────────────────────────────────────────────────────────────────
// Session
// ─────────────────────────────────────────────────────────────────────────────

export type SessionOutcome = 'success' | 'failure' | 'partial' | 'context_overflow';

export interface SessionResult {
  issueId: string;
  outcome: SessionOutcome;
  summary: string;
  gitCommit: string | null;
  contextUsed: number;
  durationMs: number;
  error: string | null;
  /** Detected model information */
  model: DetectedModel | null;
  /** Session ID for --resume support */
  sessionId: string | null;
  /** Cost in USD for this session */
  costUsd: number | null;
  /** Number of turns in this session */
  numTurns: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Redirect Detection
// ─────────────────────────────────────────────────────────────────────────────

export interface Redirect {
  type: 'priority_change' | 'new_urgent' | 'issue_closed' | 'pause_requested';
  issueId: string | null;
  description: string;
  detectedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Priming Context
// ─────────────────────────────────────────────────────────────────────────────

export interface PrimingContext {
  currentIssue: BeadsIssue;
  recentCommits: string[];
  lastCheckpoint: Checkpoint | null;
  redirectNotes: string[];
  sessionGoal: string;
  // DRY Context Discovery
  existingPatterns?: string[];
  relevantFiles?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI Options
// ─────────────────────────────────────────────────────────────────────────────

export interface StartOptions {
  specFile: string;
  checkpointEvery?: number;
  maxHours?: number;
  dryRun?: boolean;
}

export interface ResumeOptions {
  harnessId?: string;
}

export interface PauseOptions {
  reason?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Default Configuration
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_CHECKPOINT_POLICY: CheckpointPolicy = {
  afterSessions: 3,
  afterHours: 4,
  onError: true,
  onConfidenceBelow: 0.7,
  onRedirect: true,
};

// ─────────────────────────────────────────────────────────────────────────────
// Partial Failure Handling
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Configuration for handling partial failures gracefully.
 * Philosophy: Failures are information, not disasters. The harness learns
 * from failures and adjusts strategy accordingly.
 */
export interface FailureHandlingConfig {
  /** Maximum retry attempts per task (default: 2) */
  maxRetries: number;
  /** Delay between retries in ms (default: 5000) */
  retryDelayMs: number;
  /** Continue harness execution on individual failure (default: true) */
  continueOnFailure: boolean;
  /** Maximum consecutive failures before pausing (default: 3) */
  maxConsecutiveFailures: number;
  /** Record failure reason in Beads issue (default: true) */
  annotateFailures: boolean;
  /** Strategies for different failure types */
  strategies: FailureStrategies;
}

/**
 * Strategies for handling different types of failures.
 */
export interface FailureStrategies {
  /** What to do on context overflow */
  contextOverflow: FailureAction;
  /** What to do on timeout */
  timeout: FailureAction;
  /** What to do on partial completion */
  partial: FailureAction;
  /** What to do on general failure */
  failure: FailureAction;
}

/**
 * Actions to take on failure.
 */
export type FailureAction = 'retry' | 'skip' | 'pause' | 'escalate';

/**
 * Tracks failure history for an issue across retry attempts.
 */
export interface FailureRecord {
  issueId: string;
  attempts: FailureAttempt[];
  lastOutcome: SessionOutcome;
  finalAction: FailureAction;
  /** Original model selected by heuristics (before any escalation) */
  originalModel?: 'opus' | 'sonnet' | 'haiku';
  /** Whether this task required model escalation to succeed */
  escalatedToOpus?: boolean;
  /** Learning note: why escalation was needed (for pattern refinement) */
  escalationReason?: string;
}

/**
 * A single failure attempt with context.
 */
export interface FailureAttempt {
  attemptNumber: number;
  timestamp: string;
  outcome: SessionOutcome;
  error: string | null;
  durationMs: number;
  /** Model used for this attempt */
  model?: 'opus' | 'sonnet' | 'haiku';
}

/**
 * Model escalation learning record.
 * Created when a task fails with cheaper model but succeeds with opus.
 * Used to refine selectModelForTask patterns over time.
 */
export interface ModelEscalationLearning {
  issueId: string;
  issueTitle: string;
  originalModel: 'sonnet' | 'haiku';
  failedAttempts: number;
  escalatedAt: string;
  succeededWithOpus: boolean;
  /** Keywords from the issue that should trigger opus in the future */
  suggestedPatterns: string[];
}

/**
 * Result of a failure handling decision.
 */
export interface FailureDecision {
  action: FailureAction;
  reason: string;
  shouldContinue: boolean;
  shouldCreateCheckpoint: boolean;
  retryAfterMs?: number;
}

export const DEFAULT_FAILURE_HANDLING_CONFIG: FailureHandlingConfig = {
  maxRetries: 2,
  retryDelayMs: 5000,
  continueOnFailure: true,
  maxConsecutiveFailures: 3,
  annotateFailures: true,
  strategies: {
    contextOverflow: 'skip', // Context overflow rarely helps with retry
    timeout: 'retry', // Timeouts may be transient
    partial: 'skip', // Partial work done, move on
    failure: 'retry', // General failures worth retrying
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Swarm Orchestration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Configuration for parallel swarm execution.
 * Philosophy: Independent tasks can run in parallel, speeding up harness runs.
 */
export interface SwarmConfig {
  /** Maximum number of parallel agents (default: 5) */
  maxParallelAgents: number;
  /** Whether to enable swarm mode (default: false for backward compatibility) */
  enabled: boolean;
  /** Minimum tasks required to trigger swarm mode (default: 3) */
  minTasksForSwarm: number;
  /** Aggregate interval in ms - how often to collect swarm results (default: 10000) */
  aggregateIntervalMs: number;
}

export const DEFAULT_SWARM_CONFIG: SwarmConfig = {
  maxParallelAgents: 5,
  enabled: false,
  minTasksForSwarm: 3,
  aggregateIntervalMs: 10000,
};

/**
 * Tracks a single agent's progress within a swarm.
 */
export interface SwarmAgentStatus {
  agentId: string;
  issueId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: string;
  completedAt: string | null;
  outcome: SessionOutcome | null;
  error: string | null;
}

/**
 * Aggregated swarm progress for checkpoint reporting.
 */
export interface SwarmProgress {
  /** Unique ID for this swarm batch */
  batchId: string;
  /** When this batch started */
  startedAt: string;
  /** Number of agents currently running */
  activeAgents: number;
  /** Total agents spawned in this batch */
  totalAgents: number;
  /** Per-agent status */
  agentStatuses: SwarmAgentStatus[];
  /** Issues completed in this batch */
  issuesCompleted: string[];
  /** Issues failed in this batch */
  issuesFailed: string[];
  /** Issues still in progress */
  issuesInProgress: string[];
}

/**
 * Extended checkpoint with swarm support.
 */
export interface SwarmCheckpoint extends Checkpoint {
  /** Whether this checkpoint includes swarm data */
  isSwarmCheckpoint: boolean;
  /** Swarm-specific progress data */
  swarmProgress: SwarmProgress | null;
  /** Parallelism efficiency (completed / (completed + failed) for parallel tasks) */
  parallelismEfficiency: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Model Detection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Known Claude model families and their capabilities.
 * Philosophy: Different models have different strengths—the harness adapts.
 */
export type ClaudeModelFamily = 'opus' | 'sonnet' | 'haiku' | 'unknown';

/**
 * Detected model information from a Claude Code session.
 */
export interface DetectedModel {
  /** Full model identifier (e.g., "claude-opus-4-5-20251101") */
  modelId: string;
  /** Model family (opus, sonnet, haiku) */
  family: ClaudeModelFamily;
  /** Model version date if parseable (e.g., "20251101") */
  versionDate: string | null;
  /** Whether this is the latest version of the family */
  isLatest: boolean;
  /** Raw model string as returned by CLI */
  raw: string;
}

/**
 * Model-specific configuration for harness behavior.
 * Different models may require different thresholds and strategies.
 */
export interface ModelSpecificConfig {
  /** Confidence thresholds by model family */
  confidenceThresholds: Record<ClaudeModelFamily, number>;
  /** Context window sizes by model family (for overflow prediction) */
  contextWindows: Record<ClaudeModelFamily, number>;
  /** Retry strategies by model family */
  retryStrategies: Record<ClaudeModelFamily, Partial<FailureStrategies>>;
}

export const DEFAULT_MODEL_SPECIFIC_CONFIG: ModelSpecificConfig = {
  confidenceThresholds: {
    opus: 0.6, // Opus is more capable, can tolerate lower confidence
    sonnet: 0.7, // Default threshold
    haiku: 0.8, // Haiku may need higher confidence to trust results
    unknown: 0.7,
  },
  contextWindows: {
    opus: 200000, // 200k tokens
    sonnet: 200000, // 200k tokens
    haiku: 200000, // 200k tokens
    unknown: 100000,
  },
  retryStrategies: {
    opus: {}, // Use defaults
    sonnet: {}, // Use defaults
    haiku: {
      contextOverflow: 'skip', // Haiku more likely to overflow
    },
    unknown: {},
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Peer Review System
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reviewer specialization types.
 * Philosophy: Different reviewers focus on different concerns.
 */
export type ReviewerType = 'security' | 'architecture' | 'quality' | 'custom';

/**
 * Finding severity levels.
 */
export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

/**
 * Review outcome.
 */
export type ReviewOutcome = 'pass' | 'pass_with_findings' | 'fail' | 'error';

/**
 * A single finding from a reviewer.
 */
export interface ReviewFinding {
  id: string;
  severity: FindingSeverity;
  category: string;
  title: string;
  description: string;
  file?: string;
  line?: number;
  suggestion?: string;
  issueId?: string; // Related Beads issue if applicable
}

/**
 * Result from a single reviewer.
 */
export interface ReviewResult {
  reviewerId: string;
  reviewerType: ReviewerType;
  outcome: ReviewOutcome;
  findings: ReviewFinding[];
  summary: string;
  confidence: number; // 0-1
  durationMs: number;
  error?: string;
  /** Model used for this review (for escalation tracking) */
  model?: 'opus' | 'sonnet' | 'haiku';
}

/**
 * Configuration for a specific reviewer.
 */
export interface ReviewerConfig {
  id: string;
  type: ReviewerType;
  enabled: boolean;
  /** Whether this reviewer can block advancement */
  canBlock?: boolean;
  /** Custom prompt for this reviewer (overrides default) */
  customPrompt?: string;
  /** Minimum severity to report (default: 'low') */
  minSeverity?: FindingSeverity;
  /** Files/patterns to focus on */
  includePatterns?: string[];
  /** Files/patterns to exclude */
  excludePatterns?: string[];
  /**
   * Override the default model for this reviewer type.
   * If not specified, uses getReviewerModel() defaults:
   * - security → haiku (pattern detection)
   * - architecture → opus (deep analysis)
   * - quality → sonnet (balanced)
   * - custom → sonnet (safe default)
   */
  model?: 'haiku' | 'sonnet' | 'opus';
}

/**
 * Configuration for the review pipeline.
 * Philosophy: Peer reviewers provide first-pass analysis, humans review summaries.
 */
export interface ReviewPipelineConfig {
  /** Whether peer review is enabled */
  enabled: boolean;
  /** Minimum confidence to auto-advance (default: 0.8) */
  minConfidenceToAdvance: number;
  /** Whether critical findings block advancement (default: true) */
  blockOnCritical: boolean;
  /** Whether high findings block advancement (default: false) */
  blockOnHigh: boolean;
  /** Maximum parallel reviewers (default: 3) */
  maxParallelReviewers: number;
  /** Timeout per reviewer in ms (default: 5 minutes) */
  reviewerTimeoutMs: number;
  /** Reviewers to run */
  reviewers: ReviewerConfig[];
}

export const DEFAULT_REVIEW_PIPELINE_CONFIG: ReviewPipelineConfig = {
  enabled: true,
  minConfidenceToAdvance: 0.8,
  blockOnCritical: true,
  blockOnHigh: false,
  maxParallelReviewers: 3,
  reviewerTimeoutMs: 5 * 60 * 1000, // 5 minutes
  reviewers: [
    { id: 'security', type: 'security', enabled: true, canBlock: true },
    { id: 'architecture', type: 'architecture', enabled: true, canBlock: true },
    { id: 'quality', type: 'quality', enabled: true, canBlock: false },
  ],
};

/**
 * Aggregated review results for a checkpoint.
 */
export interface ReviewAggregation {
  checkpointId: string;
  reviewers: ReviewResult[];
  overallOutcome: ReviewOutcome;
  overallConfidence: number;
  totalFindings: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  infoCount: number;
  shouldAdvance: boolean;
  blockingReasons: string[];
  timestamp: string;
  /** Meta-review results (Bloom-inspired synthesis) */
  metaReview?: any; // Import would create circular dependency, use 'any' for now
}

/**
 * Context provided to reviewers.
 */
export interface ReviewContext {
  checkpointId: string;
  harnessId: string;
  gitDiff: string;
  /** Full diff since harness branch started - for detecting cross-checkpoint DRY violations */
  fullHarnessDiff: string;
  completedIssues: BeadsIssue[];
  filesChanged: string[];
  recentCommits: string[];
  checkpointSummary: string;
}

/**
 * Extended checkpoint with review data.
 */
export interface ReviewedCheckpoint extends Checkpoint {
  hasReview: boolean;
  reviewAggregation: ReviewAggregation | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Self-Healing Baseline (Upstream from VC)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Quality gate type for baseline checks.
 * Philosophy: Run quality gates before starting new work to prevent
 * the "broken windows" problem where existing failures mask new regressions.
 */
export type QualityGateType = 'tests' | 'typecheck' | 'lint' | 'build';

/**
 * Configuration for self-healing baseline checks.
 * Upstream pattern from Steve Yegge's VC project (90.9% quality gate pass rate).
 */
export interface BaselineConfig {
  /** Whether baseline checking is enabled (default: true) */
  enabled: boolean;
  /** Which quality gates to run */
  gates: {
    /** Run tests before starting work */
    tests: boolean;
    /** Run TypeScript type checking */
    typecheck: boolean;
    /** Run linter */
    lint: boolean;
    /** Run build */
    build: boolean;
  };
  /** Attempt auto-fix for simple failures (lint --fix, etc.) */
  autoFix: boolean;
  /** Use Ralph escalation for iterative fixing (tests, typecheck) */
  useRalphEscalation: boolean;
  /** Create blocker issues for failures that can't be auto-fixed */
  createBlockers: boolean;
  /** Maximum auto-fix attempts per gate (default: 1) */
  maxAutoFixAttempts: number;
  /** Timeout for each gate in ms (default: 5 minutes) */
  gateTimeoutMs: number;
  /** Package filter for monorepo (e.g., "harness") */
  packageFilter?: string;
}

/**
 * Result of a single quality gate check.
 */
export interface BaselineGate {
  /** Gate type */
  name: QualityGateType;
  /** Whether the gate passed */
  passed: boolean;
  /** Command output (truncated if too long) */
  output: string;
  /** Duration in ms */
  durationMs: number;
  /** Whether auto-fix was attempted */
  fixAttempted: boolean;
  /** Whether auto-fix succeeded */
  fixSucceeded: boolean;
  /** Exit code from the command */
  exitCode: number;
  /** Command that was run */
  command: string;
}

/**
 * Aggregated baseline check result.
 */
export interface BaselineResult {
  /** Whether all gates passed (after any auto-fixes) */
  passed: boolean;
  /** Individual gate results */
  gates: BaselineGate[];
  /** IDs of blocker issues created for failures */
  blockerIssues: string[];
  /** When the baseline check was run */
  timestamp: string;
  /** Total duration of all checks in ms */
  totalDurationMs: number;
  /** Summary message */
  summary: string;
}

/**
 * Baseline health tracking over time.
 * Philosophy: Track baseline health to identify flaky tests and systemic issues.
 */
export interface BaselineHealth {
  /** Total baseline checks run */
  totalChecks: number;
  /** Checks that passed on first try */
  passedFirst: number;
  /** Checks that passed after auto-fix */
  passedAfterFix: number;
  /** Checks that failed and required blocker creation */
  failed: number;
  /** Pass rate as percentage */
  passRate: number;
  /** Most common failing gates */
  commonFailures: { gate: QualityGateType; count: number }[];
  /** Last check result */
  lastResult: BaselineResult | null;
}

export const DEFAULT_BASELINE_CONFIG: BaselineConfig = {
  enabled: true,
  gates: {
    tests: true,
    typecheck: true,
    lint: true,
    build: false, // Build is expensive, off by default
  },
  autoFix: true,
  useRalphEscalation: false,
  createBlockers: true,
  maxAutoFixAttempts: 1,
  gateTimeoutMs: 5 * 60 * 1000, // 5 minutes
};

// ─────────────────────────────────────────────────────────────────────────────
// Harness Configuration (Crystallization)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Model routing configuration.
 * Philosophy: Different domains have different complexity patterns.
 * - Legal: "argue", "negotiate" → opus; "redact", "tag" → haiku
 * - Finance: "audit", "strategy" → opus; "reconcile" → haiku
 * - Web: "architect", "refactor" → opus; "typo", "rename" → haiku
 */
export interface ModelRoutingConfig {
  /** Default model for unmatched tasks */
  default: 'opus' | 'sonnet' | 'haiku';
  /** Complexity-based routing */
  complexity: {
    trivial: 'opus' | 'sonnet' | 'haiku';
    simple: 'opus' | 'sonnet' | 'haiku';
    standard: 'opus' | 'sonnet' | 'haiku';
    complex: 'opus' | 'sonnet' | 'haiku';
  };
  /** Pattern-based overrides (first match wins) */
  patterns: {
    haiku: string[];
    sonnet: string[];
    opus: string[];
  };
  /** Escalation on failure */
  escalation: {
    enabled: boolean;
    maxRetries: number;
    escalateTo: 'opus' | 'sonnet';
  };
}

/**
 * Quality gate definition for custom gates.
 * Philosophy: Different domains have different quality criteria.
 * - Legal: contract-validation, redaction-check
 * - Finance: audit-trail, compliance-check
 * - Manufacturing: tolerance-check, bom-validation
 */
export interface QualityGateDefinition {
  /** Gate name (used in reports) */
  name: string;
  /** Command to run */
  command: string;
  /** Auto-fix command (optional) */
  autoFixCommand?: string;
  /** Timeout in ms */
  timeout?: number;
  /** Whether this gate can block work */
  canBlock?: boolean;
}

/**
 * Quality gates configuration.
 */
export interface QualityGatesConfig {
  /** Whether baseline checking is enabled */
  enabled: boolean;
  /** Built-in gates (tests, typecheck, lint, build) */
  builtIn: {
    tests: boolean;
    typecheck: boolean;
    lint: boolean;
    build: boolean;
  };
  /** Custom gate definitions */
  custom: QualityGateDefinition[];
  /** Auto-fix configuration */
  autoFix: boolean;
  /** Create blocker issues for failures */
  createBlockers: boolean;
  /** Gate timeout in ms */
  gateTimeoutMs: number;
}

/**
 * Reviewer configuration for custom reviewers.
 */
export interface ReviewerDefinition {
  /** Reviewer ID */
  id: string;
  /** Reviewer type */
  type: ReviewerType;
  /** Whether enabled */
  enabled: boolean;
  /** Whether can block advancement */
  canBlock?: boolean;
  /**
   * Prompt source:
   * - Inline string: The prompt itself
   * - File path: "./reviewers/compliance.md"
   * - Package ref: "@create-something/harness/reviewers/security"
   */
  prompt?: string;
  /** File patterns to include */
  includePatterns?: string[];
  /** File patterns to exclude */
  excludePatterns?: string[];
  /**
   * Override the default model for this reviewer type.
   * If not specified, uses getReviewerModel() defaults.
   */
  model?: 'haiku' | 'sonnet' | 'opus';
}

/**
 * Reviewers configuration.
 */
export interface ReviewersConfig {
  /** Whether peer review is enabled */
  enabled: boolean;
  /** Minimum confidence to auto-advance */
  minConfidenceToAdvance: number;
  /** Whether critical findings block advancement */
  blockOnCritical: boolean;
  /** Whether high findings block advancement */
  blockOnHigh: boolean;
  /** Reviewer definitions */
  reviewers: ReviewerDefinition[];
}

/**
 * Label taxonomy configuration.
 * Philosophy: Different domains have different categorization needs.
 * - CREATE SOMETHING: agency, io, space, ltd
 * - Legal firm: litigation, corporate, ip, employment
 * - Finance: audit, tax, advisory, compliance
 */
export interface LabelTaxonomyConfig {
  /** Scope labels (property/department) */
  scope: string[];
  /** Type labels (work type) */
  type: string[];
  /** Discovery source label prefix */
  discoveryPrefix: string;
}

/**
 * Main harness configuration.
 * Philosophy: Crystallize human judgment into configurable constraints.
 * The tool recedes; the judgment remains.
 */
export interface HarnessConfig {
  /** Config schema version */
  version: string;
  /** Model routing configuration */
  modelRouting: ModelRoutingConfig;
  /** Quality gates configuration */
  qualityGates: QualityGatesConfig;
  /** Reviewers configuration */
  reviewers: ReviewersConfig;
  /** Label taxonomy */
  labels: LabelTaxonomyConfig;
  /** Checkpoint policy */
  checkpoints: CheckpointPolicy;
  /** Failure handling */
  failureHandling: FailureHandlingConfig;
  /** Swarm mode */
  swarm: SwarmConfig;
}

/**
 * Default CREATE SOMETHING harness configuration.
 * Philosophy: These are the crystallized judgments of CREATE SOMETHING.
 * Other domains fork and customize.
 */
export const DEFAULT_HARNESS_CONFIG: HarnessConfig = {
  version: '1.0',
  modelRouting: {
    default: 'sonnet',
    complexity: {
      trivial: 'haiku',
      simple: 'sonnet',
      standard: 'sonnet',
      complex: 'opus',
    },
    patterns: {
      haiku: [
        'rename', 'typo', 'comment', 'import', 'export',
        'lint', 'format', 'cleanup', 'remove unused',
        'add test for', 'update test', 'fix test',
        'bump version', 'update dependency',
      ],
      sonnet: [
        'add', 'update', 'fix', 'implement',
        'component', 'endpoint', 'route', 'page',
        'style', 'css', 'layout',
        'validation', 'error handling',
      ],
      opus: [
        'architect', 'design', 'refactor', 'migrate',
        'optimize', 'performance', 'security',
        'integration', 'system',
      ],
    },
    escalation: {
      enabled: true,
      maxRetries: 2,
      escalateTo: 'opus',
    },
  },
  qualityGates: {
    enabled: true,
    builtIn: {
      tests: true,
      typecheck: true,
      lint: true,
      build: false,
    },
    custom: [],
    autoFix: true,
    createBlockers: true,
    gateTimeoutMs: 5 * 60 * 1000,
  },
  reviewers: {
    enabled: true,
    minConfidenceToAdvance: 0.8,
    blockOnCritical: true,
    blockOnHigh: false,
    reviewers: [
      { id: 'security', type: 'security', enabled: true, canBlock: true },
      { id: 'architecture', type: 'architecture', enabled: true, canBlock: true },
      { id: 'quality', type: 'quality', enabled: true, canBlock: false },
    ],
  },
  labels: {
    scope: ['agency', 'io', 'space', 'ltd'],
    type: ['feature', 'bug', 'research', 'refactor'],
    discoveryPrefix: 'harness:',
  },
  checkpoints: DEFAULT_CHECKPOINT_POLICY,
  failureHandling: DEFAULT_FAILURE_HANDLING_CONFIG,
  swarm: DEFAULT_SWARM_CONFIG,
};

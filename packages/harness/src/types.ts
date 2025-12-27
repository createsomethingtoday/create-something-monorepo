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
  metadata?: Record<string, unknown>;
  dependencies?: Array<{
    issue_id: string;
    depends_on_id: string;
    type: string;
  }>;
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
}

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

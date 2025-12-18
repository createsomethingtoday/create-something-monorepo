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
  acceptanceCriteria: string[];
  labels: string[];
}

export interface ParsedSpec {
  title: string;
  overview: string;
  features: Feature[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Beads Integration
// ─────────────────────────────────────────────────────────────────────────────

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
